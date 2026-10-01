import 'dotenv/config';
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();
  const config = {
    riderMinimumPayout: 600,
    riderAcceptanceFloor: 650,
    riderBaseCompensation: 250,
    riderPickupCompensation: 150,
    riderTimeCommunicationCompensation: 100,
    riderFuelPricePerLitre: 1150,
    riderFuelEfficiencyKmPerLitre: 35,
    riderMaintenanceCostPerKm: 25,
    riderWaitingCompensationPerMinute: 15,
    riderRevenueShareFloor: 0.80,
    pilotMinimumContribution: -100
  };

  await client.query(`
    INSERT INTO public.platform_configurations (key, value, description)
    VALUES ('rider_economics_config', $1::jsonb, 'Pilot rider operational economics assumptions and compensation model')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  `, [JSON.stringify(config)]);

  console.log('Rider economics config successfully updated in platform_configurations');
  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
