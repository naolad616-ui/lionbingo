import Header from '../../components/layout/Header';
import CommissionEditCard from '../../components/commission/CommissionEditCard';

export default function NavCommision() {
  return (
    <div className="min-h-screen bg-lion-page">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="w-full max-w-md">
          <CommissionEditCard />
        </div>
      </main>
    </div>
  );
}
