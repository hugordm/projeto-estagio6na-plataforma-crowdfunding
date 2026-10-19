// Item de GET /campaigns/:id/donations.
export type Donation = {
  id: number;
  amount: string;
  message: string | null;
  createdAt: string;
  donorName: string;
};

// Corpo de POST /campaigns/:id/donations.
export type DonationInput = {
  amount: string;
  message?: string;
};

// Item de GET /me/donations: doação feita pelo usuário logado.
export type MyDonation = {
  id: number;
  amount: string;
  message: string | null;
  createdAt: string;
  campaign: { id: number; title: string; status: "ACTIVE" | "FINISHED" };
};
