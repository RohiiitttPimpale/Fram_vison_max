const MarketplaceTerms = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketplace Terms</h1>
        <p className="text-muted-foreground mt-1">Legal terms for participating in farmer-to-farmer transactions.</p>
      </div>

      <div className="agri-card space-y-4 text-sm text-foreground leading-6">
        <section>
          <h2 className="font-semibold mb-1">1. Platform Role</h2>
          <p>This marketplace facilitates connections between users and does not act as buyer or seller.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">2. User Responsibility</h2>
          <p>Users are responsible for verifying product quality, legal compliance, and payment terms.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">3. Dispute Handling</h2>
          <p>We may assist with inquiry records but are not liable for transaction disputes or losses.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">4. Moderation Rights</h2>
          <p>We reserve the right to remove or block listings that violate policy or legal requirements.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">5. Compliance</h2>
          <p>By publishing a listing, you confirm compliance with local agricultural, trade, and consumer laws.</p>
        </section>
      </div>
    </div>
  );
};

export default MarketplaceTerms;
