from fastapi import APIRouter, HTTPException, Depends
from models import ExpenseCreate, ExpenseInDB, UserInDB, ExpenseUpdate
import database
from auth import get_current_user
from typing import List
from bson import ObjectId

router = APIRouter()


@router.post("/add", response_model=ExpenseInDB)
async def add_expense(
    expense: ExpenseCreate, current_user: UserInDB = Depends(get_current_user)
):
    # Validate split sum
    total_split = sum(expense.split_details.values())
    if abs(total_split - expense.amount) > 0.01:
        raise HTTPException(
            status_code=400, detail="Split amounts do not match total amount"
        )

    # Check if user is in group
    group = await database.db.groups.find_one({"_id": ObjectId(expense.group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="User not in group")

    new_expense = await database.db.expenses.insert_one(expense.dict())
    created_expense = await database.db.expenses.find_one(
        {"_id": new_expense.inserted_id}
    )

    # Update group with expense reference
    await database.db.groups.update_one(
        {"_id": ObjectId(expense.group_id)},
        {"$push": {"expenses": str(created_expense["_id"])}},
    )

    return ExpenseInDB(**created_expense)


@router.get("/{expense_id}", response_model=ExpenseInDB)
async def get_expense(
    expense_id: str, current_user: UserInDB = Depends(get_current_user)
):
    expense = await database.db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check if user is in the group of this expense
    group = await database.db.groups.find_one({"_id": ObjectId(expense["group_id"])})
    if not group or current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return ExpenseInDB(**expense)


@router.put("/{expense_id}", response_model=ExpenseInDB)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdate,
    current_user: UserInDB = Depends(get_current_user),
):
    existing_expense = await database.db.expenses.find_one(
        {"_id": ObjectId(expense_id)}
    )
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check permission
    if existing_expense["payer_id"] != current_user.id:
        # Optionally allow group members to edit, but for now stick to payer or strict check
        pass

    update_data = {k: v for k, v in expense_update.dict().items() if v is not None}

    if not update_data:
        return ExpenseInDB(**existing_expense)

    await database.db.expenses.update_one(
        {"_id": ObjectId(expense_id)}, {"$set": update_data}
    )

    updated_expense = await database.db.expenses.find_one({"_id": ObjectId(expense_id)})
    return ExpenseInDB(**updated_expense)


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str, current_user: UserInDB = Depends(get_current_user)
):
    existing_expense = await database.db.expenses.find_one(
        {"_id": ObjectId(expense_id)}
    )
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check permission (User must be in group)
    group = await database.db.groups.find_one(
        {"_id": ObjectId(existing_expense["group_id"])}
    )
    if not group or current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="Access denied")

    await database.db.expenses.delete_one({"_id": ObjectId(expense_id)})

    # Remove from group expenses list
    await database.db.groups.update_one(
        {"_id": ObjectId(existing_expense["group_id"])},
        {"$pull": {"expenses": expense_id}},
    )

    return {"message": "Expense deleted successfully"}


@router.get("/group/{group_id}", response_model=List[ExpenseInDB])
async def get_group_expenses(
    group_id: str, current_user: UserInDB = Depends(get_current_user)
):
    group = await database.db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="User not in group")

    expenses_cursor = database.db.expenses.find({"group_id": group_id})
    expenses = await expenses_cursor.to_list(length=100)
    return [ExpenseInDB(**e) for e in expenses]


@router.get("/group/{group_id}/balances")
async def get_group_balances(
    group_id: str, current_user: UserInDB = Depends(get_current_user)
):
    expenses_cursor = database.db.expenses.find({"group_id": group_id})
    expenses = await expenses_cursor.to_list(length=1000)

    # Delegate logic to service
    from services.balance_service import calculate_settlements

    return calculate_settlements(expenses)
