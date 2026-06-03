from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

_is_sqlite = "sqlite" in settings.database_url
_is_pooler = "pooler.supabase.com" in settings.database_url

# Transaction pooler (porta 6543) não suporta prepared statements
_connect_args: dict = {}
if _is_sqlite:
    _connect_args = {"check_same_thread": False}
elif _is_pooler:
    _connect_args = {"statement_cache_size": 0}

engine = create_async_engine(
    settings.database_url,
    echo=settings.is_dev,
    connect_args=_connect_args,
    pool_size=5 if not _is_sqlite else 1,
    max_overflow=10 if not _is_sqlite else 0,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    if _is_sqlite:
        # SQLite: cria tabelas automaticamente
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    else:
        # Supabase: tabelas já existem (criadas via schema.sql)
        # Só testa a conexão
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
