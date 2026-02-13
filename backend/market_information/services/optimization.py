import pulp
import pandas as pd
import numpy as np

def optimize_battery(df, cfg):
    """
    Perform battery optimization based on provided dataframe and configuration.
    
    Args:
        df (pd.DataFrame): DataFrame containing 'Spot_Price', 'Bal_Price', 'Mask_Ch', 'Mask_Dis'.
        cfg (dict): Configuration dictionary.
        
    Returns:
        pd.DataFrame: Optimization results with schedule and financial metrics.
    """
    # 1. 建立問題 (最大化利潤)
    prob = pulp.LpProblem("BESS_Optimization", pulp.LpMaximize)
    
    # 2. 定義集合
    time_steps = range(cfg['T'])
    
    # 3. 定義決策變數
    # p_ch: 充電功率, p_spot: Spot放電功率, p_bal: Balance投標容量
    p_ch = pulp.LpVariable.dicts("P_ch", time_steps, lowBound=0, upBound=cfg['P_max_ch'])
    p_spot = pulp.LpVariable.dicts("P_spot", time_steps, lowBound=0, upBound=cfg['P_max_dis'])
    p_bal = pulp.LpVariable.dicts("P_bal", time_steps, lowBound=0, upBound=cfg['P_max_dis'])
    
    # u_ch, u_spot, u_bal: 0/1 狀態變數
    u_ch = pulp.LpVariable.dicts("u_ch", time_steps, cat='Binary')
    u_spot = pulp.LpVariable.dicts("u_spot", time_steps, cat='Binary')
    u_bal = pulp.LpVariable.dicts("u_bal", time_steps, cat='Binary')
    
    # e: 電池電量 (SoC)
    e = pulp.LpVariable.dicts("SoC", time_steps, 
                              lowBound=cfg['E_cap'] * cfg['SoC_min_pct'], 
                              upBound=cfg['E_cap'] * cfg['SoC_max_pct'])

    # 4. 建構目標函數與限制式
    total_profit = 0
    total_discharge_energy = 0 # 用於循環限制
    
    # 初始 SoC 數值
    soc_init_val = cfg['E_cap'] * cfg['SoC_init_pct']
    
    # 緩存 dataframe 查詢結果以加速
    spot_prices = df['Spot_Price'].values
    bal_prices = df['Bal_Price'].values if 'Bal_Price' in df.columns else np.zeros(cfg['T'])
    
    # Handle mask columns safely
    mask_ch_arr = df['Mask_Ch'].values if 'Mask_Ch' in df.columns else np.ones(cfg['T'])
    mask_dis_arr = df['Mask_Dis'].values if 'Mask_Dis' in df.columns else np.ones(cfg['T'])

    dt = cfg['dt']
    eff_dis = cfg['eff_dis']
    beta_bal = cfg['beta_bal']
    cost_cycle = cfg['Cost_cycle']
    e_loss = cfg['E_loss']
    eff_ch = cfg['eff_ch']
    
    for t in time_steps:
        # --- A. 目標函數 (利潤最大化) ---
        spot_p = spot_prices[t]
        bal_p = bal_prices[t]
        
        # 收入
        revenue_spot = p_spot[t] * spot_p * dt
        revenue_bal = p_bal[t] * bal_p * dt
        
        # 成本
        cost_charge = p_ch[t] * spot_p * dt
        
        # 壽命損耗 (Degradation)
        energy_out_spot = (p_spot[t] * dt) / eff_dis
        energy_out_bal = p_bal[t] * dt * beta_bal
        
        cost_degradation = (energy_out_spot + energy_out_bal) * cost_cycle
        
        # 加總到目標函數
        total_profit += (revenue_spot + revenue_bal - cost_charge - cost_degradation)
        
        # 累計總放電量 (給循環限制用)
        total_discharge_energy += (energy_out_spot + energy_out_bal)
        
        # --- B. 互斥與遮罩限制 ---
        # 1. 狀態互斥 (充、Spot放、Bal放 只能擇一)
        prob += u_ch[t] + u_spot[t] + u_bal[t] <= 1
        
        # 2. 時間遮罩 (Time Mask)
        prob += u_ch[t] <= mask_ch_arr[t]
        prob += u_spot[t] + u_bal[t] <= mask_dis_arr[t]
        
        # --- C. 功率限制 (Big-M / Indicator) ---
        prob += p_ch[t] <= cfg['P_max_ch'] * u_ch[t]
        
        prob += p_spot[t] <= cfg['P_max_dis'] * u_spot[t]
        prob += p_spot[t] >= cfg['Min_bid'] * u_spot[t]
        
        prob += p_bal[t] <= cfg['P_max_dis'] * u_bal[t]
        prob += p_bal[t] >= cfg['Min_bid'] * u_bal[t]
        
        # --- D. SoC 電量平衡 ---
        prev_soc = soc_init_val if t == 0 else e[t-1]
        
        energy_in = p_ch[t] * dt * eff_ch
        term_out_spot = (p_spot[t] * dt) / eff_dis
        term_out_bal = p_bal[t] * dt * beta_bal
        
        prob += e[t] == prev_soc + energy_in - term_out_spot - term_out_bal - e_loss

    # 設定目標函數
    prob += total_profit
    
    # --- E. 全域限制 ---
    # 1. 結束電量限制
    prob += e[cfg['T']-1] >= cfg['E_cap'] * cfg['SoC_end_pct']
    
    # 2. 每日循環次數限制
    prob += total_discharge_energy <= cfg['Cycle_limit'] * cfg['E_cap']

    # 5. 求解
    # 使用 CBC Solver
    solver = pulp.PULP_CBC_CMD(msg=False)
    prob.solve(solver)
    
    # 6. 整理結果
    results = []
    
    def safe_float(val, default=0.0):
        if val is None:
            return default
        try:
            f = float(val)
            if np.isnan(f) or np.isinf(f):
                return default
            return f
        except:
            return default

    e_cap = safe_float(cfg['E_cap'], 1.0) # Prevent div by zero
    if e_cap <= 0: e_cap = 1.0

    for t in time_steps:
        # 判斷當前動作
        action = "Idle"
        direction = None
        commodity_category = None

        # 取得功率數值
        val_ch = pulp.value(p_ch[t])
        val_spot = pulp.value(p_spot[t])
        val_bal = pulp.value(p_bal[t])
        val_soc = pulp.value(e[t])
        
        # Sanitize values first
        val_ch = safe_float(val_ch)
        val_spot = safe_float(val_spot)
        val_bal = safe_float(val_bal)
        val_soc = safe_float(val_soc)
        
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

        # Calculate financial values for this step
        step_revenue_spot = val_spot * spot_p * dt
        step_revenue_bal = val_bal * bal_p * dt
        step_cost_charge = val_ch * spot_p * dt
        
        revenue_total = step_revenue_spot + step_revenue_bal - step_cost_charge

        result = {
            "time_step": t,
            "price_spot": safe_float(spot_p),
            "price_bal": safe_float(bal_p),
            "action": action,
            "direction": direction,
            "commodity_category": commodity_category,
            "power_ch": val_ch,
            "power_spot": val_spot,
            "power_bal": val_bal,
            "soc_mwh": val_soc,
            "soc_pct": safe_float((val_soc / e_cap) * 100),
            "revenue": safe_float(revenue_total)
        }
        results.append(result)
        
    return pd.DataFrame(results)
