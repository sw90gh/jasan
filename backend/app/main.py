from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import assets, debts, dashboard, incomes, expenses, pensions, goals, history, simulation, pension_calc, tax, realestate, sync, external, advisor, big_expenses, budget, realvalue, insights, tools, calendar_view

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JASAN - 자산관리 시스템",
    description="개인 자산관리 토탈 솔루션",
    version="0.1.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(debts.router)
app.include_router(incomes.router)
app.include_router(expenses.router)
app.include_router(pensions.router)
app.include_router(goals.router)
app.include_router(history.router)
app.include_router(simulation.router)
app.include_router(pension_calc.router)
app.include_router(tax.router)
app.include_router(realestate.router)
app.include_router(sync.router)
app.include_router(external.router)
app.include_router(advisor.router)
app.include_router(big_expenses.router)
app.include_router(budget.router)
app.include_router(realvalue.router)
app.include_router(insights.router)
app.include_router(tools.router)
app.include_router(calendar_view.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
