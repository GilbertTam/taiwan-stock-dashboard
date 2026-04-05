import pandas as pd
import numpy as np
from typing import Dict, Any, List


def simulate_battery_manual(df: pd.DataFrame, schedule: List[Dict], cfg: Dict[str, Any]) -> pd.DataFrame:
    """
    Simulate battery operation with a user-specified manual schedule (no LP solver).
    For each time step, apply the requested action/power and track SoC.
    SoC constraints are enforced via soft clamping (power is reduced if SoC limits would be violated).
    """
    T = len(df)

    P_max_ch = float(cfg.get('P_max_ch', 0))
    P_max_dis = float(cfg.get('P_max_dis', 0))
    E_cap = float(cfg.get('E_cap', 1.0))
    if E_cap <= 0:
        E_cap = 1.0

    SoC_min = E_cap * float(cfg.get('SoC_min_pct', 0))
    SoC_max = E_cap * float(cfg.get('SoC_max_pct', 1))
    soc = E_cap * float(cfg.get('SoC_init_pct', 0))

    dt = float(cfg.get('dt', 0.5))
    eff_ch = float(cfg.get('eff_ch', 0.95))
    eff_dis = float(cfg.get('eff_dis', 0.95))
    beta_bal = float(cfg.get('beta_bal', 1.0))
    cost_cycle = float(cfg.get('Cost_cycle', 0))
    e_loss = float(cfg.get('E_loss', 0))
    cycle_limit = float(cfg.get('Cycle_limit', 1.0))
    max_total_discharge_energy = E_cap * cycle_limit if cycle_limit > 0 else float('inf')

    spot_prices = df['Spot_Price'].values
    bal_prices = df['Bal_Price'].values if 'Bal_Price' in df.columns else np.zeros(T)

    # Build a lookup: time_step -> schedule entry
    schedule_map: Dict[int, Dict] = {}
    for entry in schedule:
        schedule_map[int(entry['time_step'])] = entry

    total_discharge_energy = 0.0
    results = []

    for t in range(T):
        entry = schedule_map.get(t, {'action': 'Idle', 'power': None})
        requested_action = entry.get('action', 'Idle')
        requested_power = entry.get('power', None)

        spot_p = float(spot_prices[t]) if not np.isnan(spot_prices[t]) else 0.0
        bal_p = float(bal_prices[t]) if not np.isnan(bal_prices[t]) else 0.0

        p_ch_val = 0.0
        p_spot_val = 0.0
        p_bal_val = 0.0
        action = 'Idle'
        direction = None
        commodity_category = None
        requested_power_val = None
        was_clamped = False

        # Apply self-discharge loss before computing action
        soc_before_loss = max(SoC_min, soc - e_loss)

        if requested_action == 'Charge':
            requested_power_val = float(requested_power) if requested_power is not None else P_max_ch
            requested_power_val = min(requested_power_val, P_max_ch)
            # Max energy we can charge without exceeding SoC_max
            max_energy_in = (SoC_max - soc_before_loss) / eff_ch if eff_ch > 0 else 0
            max_power = max_energy_in / dt if dt > 0 else 0
            power = max(0.0, min(requested_power_val, max_power))
            was_clamped = power < requested_power_val - 1e-6

            if power > 1e-6:
                p_ch_val = power
                soc = soc_before_loss + p_ch_val * dt * eff_ch
                action = 'Charge'
                direction = 'charge'
                commodity_category = 'jepx_spot'
            else:
                soc = soc_before_loss

        elif requested_action == 'Discharge':
            requested_power_val = float(requested_power) if requested_power is not None else P_max_dis
            requested_power_val = min(requested_power_val, P_max_dis)
            # Max energy we can discharge without going below SoC_min
            max_energy_out = (soc_before_loss - SoC_min) * eff_dis
            max_power = max_energy_out / dt if dt > 0 else 0
            power = max(0.0, min(requested_power_val, max_power))

            # Enforce cycle limit: clamp if remaining cycle budget is exhausted
            energy_if_full = (power * dt) / eff_dis if eff_dis > 0 else 0
            remaining_cycle_budget = max_total_discharge_energy - total_discharge_energy
            if remaining_cycle_budget <= 1e-6:
                power = 0.0
            elif energy_if_full > remaining_cycle_budget + 1e-6:
                max_power_by_cycle = remaining_cycle_budget * eff_dis / dt if dt > 0 else 0
                power = min(power, max(0.0, max_power_by_cycle))

            was_clamped = power < requested_power_val - 1e-6

            if power > 1e-6:
                p_spot_val = power
                energy_drawn = (p_spot_val * dt) / eff_dis
                soc = soc_before_loss - energy_drawn
                total_discharge_energy += energy_drawn
                action = 'Discharge'
                direction = 'discharge'
                commodity_category = 'jepx_spot'
            else:
                soc = soc_before_loss

        else:
            soc = soc_before_loss

        # Clamp SoC to valid range (safety)
        soc = max(SoC_min, min(SoC_max, soc))

        # Revenue calculation
        step_revenue_spot = p_spot_val * spot_p * dt
        step_cost_charge = p_ch_val * spot_p * dt
        energy_out = (p_spot_val * dt) / eff_dis if eff_dis > 0 else 0
        step_cost_degradation = energy_out * cost_cycle
        revenue_total = step_revenue_spot - step_cost_charge - step_cost_degradation
        cycles_used_so_far = total_discharge_energy / E_cap if E_cap > 0 else 0

        soc_pct = (soc / E_cap) * 100 if E_cap > 0 else 0.0

        results.append({
            "time_step": t,
            "price_spot": spot_p,
            "price_bal": bal_p,
            "action": action,
            "direction": direction,
            "commodity_category": commodity_category,
            "power_ch": p_ch_val,
            "power_spot": p_spot_val,
            "power_bal": p_bal_val,
            "soc_mwh": round(soc, 6),
            "soc_pct": round(soc_pct, 4),
            "revenue": round(revenue_total, 6),
            "requested_power": round(requested_power_val, 6) if requested_power_val is not None else None,
            "was_clamped": was_clamped,
            "cycles_used": round(cycles_used_so_far, 6),
        })

    return pd.DataFrame(results)
