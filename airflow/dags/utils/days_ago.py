import os
import datetime
import pendulum

def days_ago(n:int, hour=0, minute=0, second=0, microsecond=0) -> datetime.datetime:
    tz = pendulum.timezone(os.environ.get("AIRFLOW__CORE__DEFAULT_TIMEZONE"))
    today = datetime.datetime.now(tz=tz).replace(
        hour=hour, minute=minute, second=second, microsecond=microsecond
    )
    return today - datetime.timedelta(days=n)
