import logging
import sys
import json
from datetime import datetime
# import os

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        if hasattr(record, "extra_data"):
             log_record.update(record.extra_data)

        # Include exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)

def log_error(logger, message: str, e: Exception, extra: dict = None):
    """Utility to log exceptions with extra context"""
    data = {"exception": str(e)}
    if extra:
        data.update(extra)
    logger.error(message, extra={"extra_data": data}, exc_info=True)

def setup_logger(name: str, log_file_path: str = None, level=logging.INFO):
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.handlers = [] # Clear existing handlers

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JsonFormatter())
    logger.addHandler(console_handler)

    # File Handler
    if log_file_path:
        os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(JsonFormatter())
        logger.addHandler(file_handler)

    return logger
