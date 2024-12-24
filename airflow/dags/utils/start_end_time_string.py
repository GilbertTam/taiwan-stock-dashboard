import datetime


def start_end_time_string(start_time: datetime.datetime, end_time: datetime.datetime):
    return f'--start_time {start_time.strftime("%Y-%m-%d")} --end_time {end_time.strftime("%Y-%m-%d")}'
