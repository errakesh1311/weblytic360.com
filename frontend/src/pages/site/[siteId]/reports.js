import MetricPage from '../../../components/MetricPage';

export default function ReportsPage() {
  return (
    <MetricPage
      title="Reports"
      panels={[
        { type: 'url', title: 'Top pages', label: 'Views' },
        { type: 'referrer', title: 'Top sources', label: 'Visitors' },
        { type: 'country', title: 'Top countries', label: 'Visitors' },
        { type: 'device', title: 'Devices', label: 'Visitors' },
        { type: 'browser', title: 'Browsers', label: 'Visitors' },
        { type: 'utm_campaign', title: 'UTM campaigns', label: 'Visitors' },
      ]}
    />
  );
}
