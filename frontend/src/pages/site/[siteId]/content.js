import MetricPage from '../../../components/MetricPage';

export default function ContentPage() {
  return (
    <MetricPage
      title="Content"
      panels={[
        { type: 'url', title: 'Top pages', label: 'Views' },
        { type: 'event', title: 'Custom events', label: 'Count' },
      ]}
    />
  );
}