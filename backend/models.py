from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from database import Base
from datetime import datetime

class InteractionLog(Base):
    __tablename__ = "interaction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String, index=True)
    interaction_type = Column(String)
    notes = Column(Text)
    sentiment = Column(String)
    brochures_shared = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)