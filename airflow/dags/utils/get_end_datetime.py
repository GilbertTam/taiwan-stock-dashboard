import datetime

def get_end_datetime(now_date, reset_hour=False):
    if reset_hour:
        hour = 0
    else:
        hour = now_date.hour
    return datetime.datetime(
        now_date.year,
        now_date.month,
        now_date.day,
        hour,
        0,
        0
    )
