from fastapi import APIRouter, Depends
import models
import database
from auth import get_current_user
from utils import get_password_hash
from bson import ObjectId
from upload import delete_image_file

router = APIRouter()


@router.get("/me", response_model=models.UserInDB)
async def read_users_me(current_user: models.UserInDB = Depends(get_current_user)):
    return current_user


@router.put("/update", response_model=models.UserInDB)
async def update_user(
    user_update: models.UserUpdate,
    current_user: models.UserInDB = Depends(get_current_user),
):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}

    # Handle password update separately to hash it
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data["password"])
        del update_data["password"]

    if not update_data:
        return current_user

    # Delete old avatar if it's being replaced
    if "avatar" in update_data and update_data["avatar"] != current_user.avatar:
        delete_image_file(current_user.avatar)

    await database.db.users.update_one(
        {"_id": ObjectId(current_user.id)}, {"$set": update_data}
    )

    updated_user = await database.db.users.find_one({"_id": ObjectId(current_user.id)})
    return models.UserInDB(**updated_user)


@router.post("/disable")
async def disable_user(current_user: models.UserInDB = Depends(get_current_user)):
    await database.db.users.update_one(
        {"_id": ObjectId(current_user.id)}, {"$set": {"is_active": False}}
    )
    return {"message": "User account disabled successfully"}


@router.get("/stats")
async def get_user_stats(current_user: models.UserInDB = Depends(get_current_user)):
    # Match expenses where user is payer OR involved in split
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"payer_id": current_user.id},
                    {f"split_details.{current_user.id}": {"$exists": True}},
                ]
            }
        },
        {"$sort": {"date": -1}},
    ]

    expenses_cursor = database.db.expenses.aggregate(pipeline)
    expenses = await expenses_cursor.to_list(length=1000)

    total_paid = 0.0
    total_share = 0.0

    processed_expenses = []

    # Process expenses for validation and calculation
    for e in expenses:
        # Convert ObjectId to string
        if "_id" in e:
            e["id"] = str(e["_id"])
            del e["_id"]

        # Calculate stats
        amount = e.get("amount", 0.0)
        payer_id = e.get("payer_id")
        split_details = e.get("split_details", {})

        my_share = split_details.get(current_user.id, 0.0)

        if payer_id == current_user.id:
            total_paid += amount

        total_share += my_share

        # Add 'my_share' to expense object for frontend consistency if needed
        e["my_share"] = my_share
        processed_expenses.append(e)

    net_balance = total_paid - total_share

    # Monthly Activity (Last 6 months using my_share - Cost)
    from datetime import datetime, timedelta

    today = datetime.utcnow()
    # Initialize last 6 months buckets
    monthly_stats = {}
    for i in range(5, -1, -1):
        d = today - timedelta(days=i * 30)  # Approx month
        month_label = d.strftime("%b")  # Jan, Feb
        monthly_stats[month_label] = 0.0

    # Aggregate
    for e in processed_expenses:
        if "date" in e and e["date"]:
            dt = e["date"]
            if (today - dt).days < 180:
                month_label = dt.strftime("%b")
                if month_label in monthly_stats:
                    monthly_stats[month_label] += e["my_share"]

    chart_data = [{"name": k, "amount": round(v, 2)} for k, v in monthly_stats.items()]

    return {
        "total_spent": round(
            total_share, 2
        ),  # Keeping naming consistent with frontend (My Cost)
        "total_paid": round(total_paid, 2),
        "net_balance": round(net_balance, 2),
        "recent_expenses": processed_expenses[:5],
        "expense_count": len(processed_expenses),
        "monthly_activity": chart_data,
    }
