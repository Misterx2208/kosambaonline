# Online Kosamba

## What will be built
- A polished breakfast ordering site with a browsable menu, prices, item availability, and a cart/checkout view.
- Checkout will open a prefilled WhatsApp message to the number configured in the manager area.
- A manager screen will unlock with the provided shared password `2208`, allowing items and prices to be added, edited, enabled, disabled, or removed, and the WhatsApp number to be changed.
- Menu and contact settings will persist through Lovable Cloud; public visitors can read the menu, while edits require the server-verified manager session.

## Technical details
- Create a public-read, server-write menu/settings schema with explicit grants and row-level security.
- Keep the shared password server-side and persist the unlocked state in an encrypted session; validate edits on the server.
- Build the first screen at `/`, with a separate manager route, responsive layout, and route-specific metadata.
