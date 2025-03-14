from typing import Tuple, Optional
import datetime

from loguru import logger

def now_after_24h(from_datetime:Optional[str]=None, to_datetime:Optional[str]=None) -> Tuple[str, str]:
    """
    Get the start and end time after 24 hours from the given datetime.
    
    Args:
        from_datetime (str, optional): The start time in the format YYYYMMDDHH0000. Defaults to None.
        to_datetime (str, optional): The end time in the format YYYYMMDDHH0000. Defaults to None.
    """

    # Change type from str to datetime
    try:
        if from_datetime is not None:
            from_datetime = datetime.datetime.strptime(from_datetime, "%Y%m%d%H0000")
            logger.debug("from_datetime: {}", from_datetime)
        if to_datetime is not None:
            to_datetime = datetime.datetime.strptime(to_datetime, "%Y%m%d%H0000")
            logger.debug("to_datetime: {}", to_datetime)
    except ValueError as e:
        raise ValueError("Invalid datetime format. Please use YYYYMMDDHH0000.") from e

    # Check from_datetime is less than to_datetime
    if from_datetime is not None and to_datetime is not None:
        if from_datetime > to_datetime:
            raise ValueError("from_datetime must be less than to_datetime")
    elif from_datetime is not None and to_datetime is None:
        # from_datetime to 24 hours later
        to_datetime = from_datetime + datetime.timedelta(hours=24)
        logger.warning("to_datetime is None. Set to_datetime as 24 hours later from from_datetime.")
        logger.warning("to_datetime: {}", to_datetime)
    elif from_datetime is None and to_datetime is not None:
        # 24 hours before to_datetime
        from_datetime = to_datetime - datetime.timedelta(hours=24)
        logger.warning("from_datetime is None. Set from_datetime as 24 hours before to_datetime.")
        logger.warning("from_datetime: {}", from_datetime)
    else:
        # Both from_datetime and to_datetime are None
        now = datetime.datetime.now()
        from_datetime = now
        to_datetime = now + datetime.timedelta(hours=24)
        logger.warning("from_datetime and to_datetime are None. Set from_datetime as now and to_datetime as 24 hours later.")
        logger.warning("from_datetime: {}", from_datetime)
        logger.warning("to_datetime: {}", to_datetime)

    # Set the format as "YYYYMMDDHH0000"
    logger.debug("Set the format as 'YYYYMMDDHH0000'")
    return from_datetime.strftime("%Y%m%d%H0000"), to_datetime.strftime("%Y%m%d%H0000")
