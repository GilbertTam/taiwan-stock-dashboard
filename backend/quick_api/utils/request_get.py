from typing import Dict, Optional
from urllib.parse import urljoin

import requests
from loguru import logger

def request_get(
    session:requests.Session,
    url:str,
    params:Dict[str, str],
    show=False,
) -> Optional[Dict[str, str]]:
    """
    Make a request to the API.
    ;param session: requests.Session
    ;param url: str
    ;param params: Dict[str, str]
    ;param show: bool
    ;return: Optional[Dict[str, str]]
    """
    if show:
        # If show is True, display request details
        logger.info(f"Making GET request to {url}")
        logger.info(f"Request parameters: {params}")
    try:
        response = session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")