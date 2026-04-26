import { getCommonMessages, DEFAULT_LOCALE } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';

export default function AdminHome(): JSX.Element {
  const messages = getCommonMessages(DEFAULT_LOCALE);
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
      <p className="text-muted-foreground">{messages.app.tagline}</p>
      <div className="flex gap-3">
        <Button variant="secondary">Dashboard</Button>
        <Button variant="outline">Settings</Button>
      </div>
    </section>
  );
}
