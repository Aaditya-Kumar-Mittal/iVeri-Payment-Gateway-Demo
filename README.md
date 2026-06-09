# iVeri Enterprise Payment Flow Demo

## Updated Flows

### 🔒 Token-Based Pre-Authorisation Flow

The pre-authorisation flow has been restructured with **tokenization as the first step**, using a flexible authorization amount:

1. **Step 1: Tokenize Card (Add Card)**
   - Command: `PANToken` (Enquiry)
   - Creates a reusable token using **minimal amount (1¢)** for validation
   - Returns: `TransactionIndex` (token), masked PAN, expiry date
   - The tokenization amount is independent of the payment amount

2. **Step 2: Pre-Authorise with Token**
   - Command: `Authorisation` + token (TransactionIndex)
   - **You enter the authorization amount** (how much to reserve)
   - Can be any amount you choose, independent of tokenization amount
   - Reserves funds without capturing
   - Uses the token from Step 1 instead of full PAN

3. **Step 3: Additional Authorisation (Optional)**
   - Increase the reserved amount if needed
   - Uses the `TransactionIndex` from Step 2

4. **Step 4: Capture Payment OR Auto Reverse**
   - **Option A - Capture**: Command: `Debit` with `TransactionIndex`
   - **Option B - Auto Reverse**: Command: `AuthorisationReversal` with `TransactionIndex`

5. **Step 5: Countdown & Refund Decision (if captured)**
   - 5-second countdown timer
   - Choose to **Keep Payment** or **Refund Now**
   - If refund chosen, proceeds to Step 6

6. **Step 5B: Verify Auto Reversal Status (if reversed)**
   - Command: `TransactionStatus` enquiry
   - Confirms reversal was successful
   - Verifies funds returned to cardholder

7. **Step 6/7: Refund (Optional)**
   - Command: `Credit` with `TransactionIndex`
   - Issues full or partial refund
   - Available for 6 months after original transaction

### 💳 Prepayment Flow (Unchanged)

Remains as originally designed for immediate payment capture.

---

## FAQ: Tokenization Amount vs Authorization Amount

**Question**: Why is the tokenization amount different from the authorization amount? Can I use different amounts?

**Answer**: 

Yes! This is exactly how the updated flow works:

1. **Tokenization Amount (1¢)**: 
   - Used only for card validation and risk assessment
   - Doesn't commit any funds
   - Creates a reusable token

2. **Authorization Amount (Your Choice)**:
   - You enter this in Step 2 after the card is tokenized
   - This is the amount that will be reserved on the cardholder's account
   - Can be any amount you choose
   - Independent of the tokenization amount

**Example Flow**:
- Step 1: Tokenize card with 1¢ → Creates token
- Step 2: Authorize with R 500.00 → Reserves R 500 using the token
- Step 3: Capture with R 500.00 → Transfers the reserved R 500

This provides flexibility because:
- **Tokenization** is cheap (uses minimal amount) just to validate the card works
- **Authorization** is flexible - you decide how much to reserve later
- You can reuse the same token for multiple different amounts

---

## Implementation Details

### Flow Changes

- **Tokenization** is now the mandatory first step in the pre-auth flow
- The token (`TransactionIndex` + masked PAN) is reused for authorization instead of raw card details
- A **5-second countdown timer** appears after payment capture, allowing the merchant to decide whether to refund
- **Auto Reversal** now includes a verification step to confirm the reversal was successful

### State Management

New state variables:
- `state.panToken`: Stores the token TransactionIndex
- `state.tokenMaskedPAN`: Masked PAN from token response
- `state.tokenExpiry`: Expiry date from token response
- `state.countdownActive`: Tracks if countdown is running

### Countdown Timer

- Uses SVG progress ring with stroke-dasharray animation
- Auto-disables refund buttons during countdown
- Enables them when countdown completes
- Supports interruption via `clearInterval(countdownInterval)`

---

## Testing

1. **Start the server:**
   ```bash
   npm install
   npm start
   ```
   Opens on: http://localhost:3000

2. **Configure credentials:**
   - Enter your iVeri Certificate ID
   - Enter your Application ID
   - Set mode (Test/Live)

3. **Use test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `1226`
   - CVV: `123`
   - Click "Auto-fill" button to populate

4. **Walk through the flow:**
   - Tokenize → Pre-Auth → Capture → Countdown → Keep/Refund

---

## API Commands Used

| Command | Type | Purpose |
|---------|------|---------|
| PANToken | Enquiry | Tokenize card, create reusable token |
| Authorisation | Transaction | Reserve funds (with token or PAN) |
| Debit | Transaction | Capture/transfer funds (with TransactionIndex) |
| AuthorisationReversal | Transaction | Cancel/reverse authorization hold |
| Credit | Transaction | Issue refund (with TransactionIndex) |
| TransactionStatus | Enquiry | Query transaction status |

---

## Architecture

- **Frontend**: [index.html](index.html) – Single-page app with inline CSS & JS
- **Backend**: [server.js](server.js) – Express.js proxy to iVeri gateway (avoids CORS issues)
- **Credentials**: Configured via gateway configuration panel at top of page

---

## Support

For issues with:
- **iVeri API**: Contact assist@iveri.co.za
- **This demo**: Check server logs for request/response details
- **Authentication**: Ensure Certificate ID and Application ID are correct
