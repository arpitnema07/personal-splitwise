from typing import List, Dict


def calculate_settlements(expenses: List[dict]) -> List[dict]:
    balances: Dict[str, float] = {}

    for expense in expenses:
        # Normalize ObjectId vs str
        payer = str(expense["payer_id"])
        amount = float(expense["amount"])
        splits = expense.get("split_details", {})

        balances[payer] = balances.get(payer, 0.0) + amount

        for uid, share in splits.items():
            uid_str = str(uid)
            balances[uid_str] = balances.get(uid_str, 0.0) - float(share)

    # Simplify debts (greedy approach)
    debtors = []
    creditors = []

    for uid, bal in balances.items():
        if bal < -0.01:
            debtors.append({"id": uid, "amount": bal})
        elif bal > 0.01:
            creditors.append({"id": uid, "amount": bal})

    debtors.sort(key=lambda x: x["amount"])
    creditors.sort(key=lambda x: x["amount"], reverse=True)

    settlements = []

    d_idx = 0
    c_idx = 0

    while d_idx < len(debtors) and c_idx < len(creditors):
        debtor = debtors[d_idx]
        creditor = creditors[c_idx]

        amount = min(abs(debtor["amount"]), creditor["amount"])

        settlements.append(
            {"from": debtor["id"], "to": creditor["id"], "amount": round(amount, 2)}
        )

        debtor["amount"] += amount
        creditor["amount"] -= amount

        if abs(debtor["amount"]) < 0.01:
            d_idx += 1
        if creditor["amount"] < 0.01:
            c_idx += 1

    return settlements
