import Header from './Header';

export default function PagePlaceholder({ title }) {
  return (
    <div className="min-h-screen bg-lion-page">
      <Header />
      <main className="px-4 py-8 sm:px-6 md:px-8">
        <h1 className="text-xl font-medium text-gray-800">{title}</h1>
      </main>
    </div>
  );
}
