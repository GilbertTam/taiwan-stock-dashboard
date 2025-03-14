from typing import Tuple, Optional
import datetime

def get_current_date():
    return datetime.datetime.now().strftime("%Y%m%d")

def check_date(from_date:Optional[str]=None, end_date:Optional[str]=None) -> Tuple[str, str]:
    """
    Check if the from_date is less than end_date.
    
    Args:
        from_date (str): The start date. Format is YYYYMMDD.
        end_date (str): The end date. Format is YYYYMMDD.

    Returns:
        Tuple[str, str]: The start date and the end date.
    """
    
    # Change type from str to date
    if from_date is not None:
        from_date = datetime.datetime.strptime(from_date, "%Y%m%d")
    if end_date is not None:
        end_date = datetime.datetime.strptime(end_date, "%Y%m%d")
        
    # Check from_date is less than end_date
    if from_date is not None and end_date is not None:
        if from_date > end_date:
            raise ValueError("from_date must be less than end_date")
    elif from_date is not None and end_date is None:
        # Set end_date to current date(Today)
        end_date = from_date
    elif from_date is None and end_date is not None:
        # Set from_date to current date(Today)
        from_date = end_date
    else:
        # Set from_date and end_date to current date(Today)
        from_date = end_date = datetime.datetime.now().date()

    # Change type from date to str
    return from_date.strftime("%Y%m%d"), end_date.strftime("%Y%m%d")
