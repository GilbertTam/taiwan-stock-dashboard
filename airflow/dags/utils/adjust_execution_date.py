import os
import datetime
import logging as logger

from pytz import timezone

from utils.get_end_datetime import get_end_datetime

def adjust_execution_date(execution_date:datetime.datetime, reset_hour=False) -> datetime.datetime:
    logger.info("==============")
    logger.info("Execution Date")
    logger.info(execution_date)
    logger.info("==============")
    tz = timezone(os.environ.get("AIRFLOW__CORE__DEFAULT_TIMEZONE"))
    execution_date = execution_date.astimezone(tz)
    logger.info("Execution Date (Time Zone)")
    logger.info(execution_date)
    logger.info("==============")
    end_datetime = get_end_datetime(execution_date, reset_hour=reset_hour)
    logger.info("End Date")
    logger.info(end_datetime)
    logger.info("==============")
    return end_datetime