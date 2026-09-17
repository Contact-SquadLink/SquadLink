// No-op placeholder. Guest cart is stored in localStorage and used directly.
// When the SQUADLINK backend is connected, this will transfer guest cart
// items to the authenticated server-side cart after login.
export async function transferGuestCart(): Promise<void> {
  // Intentionally empty — cart persists in localStorage for the demo.
}
