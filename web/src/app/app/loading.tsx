export default function AppLoading() {
  return (
    <div className="page route-loading" aria-label="Loading page" aria-busy="true">
      <div className="route-loading-heading">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="route-loading-grid">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}
