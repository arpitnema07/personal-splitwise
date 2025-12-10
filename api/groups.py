from fastapi import APIRouter, HTTPException, Depends
import models
from models import (
    GroupCreate,
    GroupInDB,
    UserInDB,
    GroupWithMembers,
    UserSummary,
    ExpenseUpdate,
)
import database
from auth import get_current_user
from typing import List
import uuid
from bson import ObjectId
from upload import delete_image_file

router = APIRouter()


@router.post("/create", response_model=GroupInDB)
async def create_group(
    group: GroupCreate, current_user: UserInDB = Depends(get_current_user)
):
    group_data = group.dict()
    group_data["members"] = [current_user.id]
    group_data["invite_code"] = str(uuid.uuid4())[:8]

    new_group = await database.db.groups.insert_one(group_data)
    created_group = await database.db.groups.find_one({"_id": new_group.inserted_id})
    return GroupInDB(**created_group)


@router.post("/join/{invite_code}", response_model=GroupInDB)
async def join_group(
    invite_code: str, current_user: UserInDB = Depends(get_current_user)
):
    group = await database.db.groups.find_one({"invite_code": invite_code})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id in group["members"]:
        return GroupInDB(**group)  # Already a member

    await database.db.groups.update_one(
        {"_id": group["_id"]}, {"$push": {"members": current_user.id}}
    )

    updated_group = await database.db.groups.find_one({"_id": group["_id"]})
    return GroupInDB(**updated_group)


@router.get("/my", response_model=List[GroupInDB])
async def get_my_groups(current_user: UserInDB = Depends(get_current_user)):
    groups_cursor = database.db.groups.find({"members": current_user.id})
    groups = await groups_cursor.to_list(length=100)
    return [GroupInDB(**g) for g in groups]


@router.get("/{group_id}", response_model=GroupWithMembers)
async def get_group_details(
    group_id: str, current_user: UserInDB = Depends(get_current_user)
):
    group = await database.db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="User not in group")

    # Fetch member details
    members_details = []
    for member_id in group["members"]:
        user = await database.db.users.find_one({"_id": ObjectId(member_id)})
        if user:
            members_details.append(
                UserSummary(
                    id=str(user["_id"]),
                    name=user["name"],
                    email=user["email"],
                    avatar=user.get("avatar"),
                )
            )

    group_with_members = GroupWithMembers(**group)
    group_with_members.members_details = members_details
    return group_with_members


@router.put("/{group_id}", response_model=GroupInDB)
async def update_group(
    group_id: str,
    group_update: models.GroupUpdate,
    current_user: UserInDB = Depends(get_current_user),
):
    group = await database.db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = {k: v for k, v in group_update.dict().items() if v is not None}

    if not update_data:
        return GroupInDB(**group)

    # Delete old icon if it's being replaced
    if "icon" in update_data and update_data["icon"] != group.get("icon"):
        delete_image_file(group.get("icon"))

    await database.db.groups.update_one(
        {"_id": ObjectId(group_id)}, {"$set": update_data}
    )

    updated_group = await database.db.groups.find_one({"_id": ObjectId(group_id)})
    return GroupInDB(**updated_group)


@router.delete("/{group_id}")
async def delete_group(
    group_id: str, current_user: UserInDB = Depends(get_current_user)
):
    group = await database.db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # cascading delete expenses
    await database.db.expenses.delete_many({"group_id": group_id})
    await database.db.groups.delete_one({"_id": ObjectId(group_id)})

    return {"message": "Group deleted successfully"}


@router.get("/{group_id}/export")
async def export_group_expenses(
    group_id: str, current_user: UserInDB = Depends(get_current_user)
):
    group = await database.db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.id not in group["members"]:
        raise HTTPException(status_code=403, detail="Access denied")

    expenses_cursor = database.db.expenses.find({"group_id": group_id})
    expenses = await expenses_cursor.to_list(length=1000)

    # Generate CSV in memory
    import io
    import csv
    from fastapi.responses import StreamingResponse

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Category", "Amount", "Payer", "Splits"])

    for exp in expenses:
        # Get payer name
        payer = await database.db.users.find_one({"_id": ObjectId(exp["payer_id"])})
        payer_name = payer["name"] if payer else "Unknown"

        # Format splits
        splits_str = ", ".join(
            [f"{uid}:{amt}" for uid, amt in exp["split_details"].items()]
        )

        writer.writerow(
            [
                exp.get("date", ""),
                exp["description"],
                exp.get("category", "General"),
                exp["amount"],
                payer_name,
                splits_str,
            ]
        )

    output.seek(0)

    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = (
        f"attachment; filename=group_{group_id}_expenses.csv"
    )
    return response
