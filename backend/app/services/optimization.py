import pulp
import pandas as pd
import numpy as np
from typing import Dict, Any, List

def optimize_battery(df: pd.DataFrame, cfg: Dict[str, Any]) -> pd.DataFrame:
    """
    Perform battery optimization based on provided dataframe and configuration.
    Ported from legacy optimization.py
    """
    # 1. Setup Problem
    prob = pulp.LpProblem("BESS_Optimization", pulp.LpMaximize)
    
    # Defaults and validation
    T = int(cfg.get('T', len(df)))
    time_steps = range(T)
    
    P_max_ch = float(cfg.get('P_max_ch', 0))
    P_max_dis = float(cfg.get('P_max_dis', 0))
    E_cap = float(cfg.get('E_cap', 0))
    if E_cap <= 0: E_cap = 1.0 # Prevent div error
    
    SoC_min_pct = float(cfg.get('SoC_min_pct', 0))
    SoC_max_pct = float(cfg.get('SoC_max_pct', 1))
    SoC_init_pct = float(cfg.get('SoC_init_pct', 0))
    SoC_end_pct = float(cfg.get('SoC_end_pct', 0))
    
    dt = float(cfg.get('dt', 0.5))
    eff_ch = float(cfg.get('eff_ch', 0.95))
    eff_dis = float(cfg.get('eff_dis', 0.95))
    beta_bal = float(cfg.get('beta_bal', 1.0))
    cost_cycle = float(cfg.get('Cost_cycle', 0))
    e_loss = float(cfg.get('E_loss', 0))
    cycle_limit = float(cfg.get('Cycle_limit', 100))
    min_bid = float(cfg.get('Min_bid', 0))

    # Variables
    p_ch = pulp.LpVariable.dicts("P_ch", time_steps, lowBound=0, upBound=P_max_ch)
    p_spot = pulp.LpVariable.dicts("P_spot", time_steps, lowBound=0, upBound=P_max_dis)
    p_bal = pulp.LpVariable.dicts("P_bal", time_steps, lowBound=0, upBound=P_max_dis)
    
    u_ch = pulp.LpVariable.dicts("u_ch", time_steps, cat='Binary')
    u_spot = pulp.LpVariable.dicts("u_spot", time_steps, cat='Binary')
    u_bal = pulp.LpVariable.dicts("u_bal", time_steps, cat='Binary')
    
    e = pulp.LpVariable.dicts("SoC", time_steps, 
                              lowBound=E_cap * SoC_min_pct, 
                              upBound=E_cap * SoC_max_pct)

    # Objective
    total_profit = 0
    total_discharge_energy = 0
    soc_init_val = E_cap * SoC_init_pct
    
    spot_prices = df['Spot_Price'].values
    bal_prices = df['Bal_Price'].values if 'Bal_Price' in df.columns else np.zeros(T)
    mask_ch_arr = df['Mask_Ch'].values if 'Mask_Ch' in df.columns else np.ones(T)
    mask_dis_arr = df['Mask_Dis'].values if 'Mask_Dis' in df.columns else np.ones(T)

    for t in time_steps:
        spot_p = spot_prices[t]
        bal_p = bal_prices[t]
        
        # Revenue/Cost
        revenue_spot = p_spot[t] * spot_p * dt
        revenue_bal = p_bal[t] * bal_p * dt
        cost_charge = p_ch[t] * spot_p * dt
        
        # Degradation
        energy_out_spot = (p_spot[t] * dt) / eff_dis
        energy_out_bal = p_bal[t] * dt * beta_bal
        cost_degradation = (energy_out_spot + energy_out_bal) * cost_cycle
        
        total_profit += (revenue_spot + revenue_bal - cost_charge - cost_degradation)
        total_discharge_energy += (energy_out_spot + energy_out_bal)
        
        # Constraints
        prob += u_ch[t] + u_spot[t] + u_bal[t] <= 1
        prob += u_ch[t] <= mask_ch_arr[t]
        prob += u_spot[t] + u_bal[t] <= mask_dis_arr[t]
        
        prob += p_ch[t] <= P_max_ch * u_ch[t]
        prob += p_spot[t] <= P_max_dis * u_spot[t]
        prob += p_spot[t] >= min_bid * u_spot[t]
        prob += p_bal[t] <= P_max_dis * u_bal[t]
        prob += p_bal[t] >= min_bid * u_bal[t]
        
        # SoC continuity
        prev_soc = soc_init_val if t == 0 else e[t-1]
        energy_in = p_ch[t] * dt * eff_ch
        term_out_spot = (p_spot[t] * dt) / eff_dis
        term_out_bal = p_bal[t] * dt * beta_bal
        
        prob += e[t] == prev_soc + energy_in - term_out_spot - term_out_bal - e_loss

    prob += total_profit
    
    # Global Constraints
    if T > 0:
        prob += e[T-1] >= E_cap * SoC_end_pct
    prob += total_discharge_energy <= cycle_limit * E_cap

    # Solve
    solver = pulp.PULP_CBC_CMD(msg=False)
    prob.solve(solver)
    
    # Collect results
    results = []
    
    def safe_float(val, default=0.0):
        if val is None: return default
        try:
            f = float(val)
            if np.isnan(f) or np.isinf(f): return default
            return f
        except: return default

    for t in time_steps:
        action = "Idle"
        direction = None
        commodity_category = None
        
        val_ch = safe_float(pulp.value(p_ch[t]))
        val_spot = safe_float(pulp.value(p_spot[t]))
        val_bal = safe_float(pulp.value(p_bal[t]))
        val_soc = safe_float(pulp.value(e[t]))
        
        threshold = 1e-3
        if val_ch > threshold:
            action = "Charge"
            direction = "charge"
            commodity_category = "jepx_spot"
        elif val_spot > threshold:
            action = "Spot"
            direction = "discharge"
            commodity_category = "jepx_spot"
        elif val_bal > threshold:
            action = "Balance"
            direction = "discharge"
            commodity_category = "tso"
            
        spot_p = safe_float(spot_prices[t])
        bal_p = safe_float(bal_prices[t])
        
        step_revenue_spot = val_spot * spot_p * dt
        step_revenue_bal = val_bal * bal_p * dt
        step_cost_charge = val_ch * spot_p * dt
        revenue_total = step_revenue_spot + step_revenue_bal - step_cost_charge
        
        results.append({
            "time_step": t,
            "price_spot": spot_p,
            "price_bal": bal_p,
            "action": action,
            "direction": direction,
            "commodity_category": commodity_category,
            "power_ch": val_ch,
            "power_spot": val_spot,
            "power_bal": val_bal,
            "soc_mwh": val_soc,
            "soc_pct": safe_float((val_soc / E_cap) * 100),
            "revenue": safe_float(revenue_total)
        })
        
    return pd.DataFrame(results)
