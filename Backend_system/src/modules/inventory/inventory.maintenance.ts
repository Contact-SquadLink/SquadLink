import { withTransaction } from "../../db/transaction";

export async function expireInventoryReservations(): Promise<number> {
  return withTransaction(async (client) => {
    const reservations = await client.query<{
      id: string;
      inventory_id: string;
      quantity: number;
      order_id: string;
    }>(
      `
        SELECT id, inventory_id, quantity, order_id
        FROM public.inventory_reservations
        WHERE status = 'ACTIVE'
          AND expires_at <= NOW()
        FOR UPDATE SKIP LOCKED
      `
    );

    for (const reservation of reservations.rows) {
      await client.query(
        `
          UPDATE public.inventory
          SET quantity_reserved = quantity_reserved - $1,
              updated_at = NOW(),
              last_updated_at = NOW()
          WHERE id = $2
            AND quantity_reserved >= $1
        `,
        [reservation.quantity, reservation.inventory_id]
      );
      await client.query(
        `UPDATE public.inventory_reservations SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
        [reservation.id]
      );
      await client.query(
        `
          INSERT INTO public.inventory_reservation_history
            (reservation_id, previous_status, new_status, quantity, changed_by, reason)
          VALUES ($1, 'ACTIVE', 'EXPIRED', $2, NULL, 'Inventory reservation expired before payment completion.')
        `,
        [reservation.id, reservation.quantity]
      );
    }

    return reservations.rows.length;
  });
}
