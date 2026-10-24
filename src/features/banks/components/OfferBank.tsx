import { bankAppTarget } from '../services/app-links';
import { ArrowUpRight, Globe2 } from 'lucide-react';
import { BankLogo } from './BankLogo';
import { getBankApp, mobilePlatform, type BankApp } from '../model/bank-apps';
import { bankColors } from '../model/bank-colors';
import type { CSSProperties } from 'react';

export function OfferBank({
  bank,
  mobile,
  onLaunch,
}: {
  bank: string;
  mobile: boolean;
  onLaunch: (app: BankApp) => void;
}) {
  const colors = bankColors(bank);
  const labelStyle = {
    '--bank-label-ink': colors.foreground,
    '--bank-label-surface': colors.background,
  } as CSSProperties;
  const app = mobile ? getBankApp(bank) : undefined;
  const target = app
    ? bankAppTarget(
        app,
        mobilePlatform(navigator.userAgent, navigator.maxTouchPoints, navigator.platform),
      )
    : undefined;
  const href = target?.href;
  const webApp = target?.webApp === true;
  const LaunchIcon = webApp ? Globe2 : ArrowUpRight;
  const launchLabel = app
    ? webApp
      ? `Открыть веб-банк ${app.name}`
      : `Открыть приложение банка ${app.name}`
    : undefined;
  const label = (
    <>
      <BankLogo bank={bank} />
      <span className="bank-label" title={bank} style={labelStyle}>
        {bank}
      </span>
    </>
  );
  return (
    <div className="bank-name">
      {app && href ? (
        <a
          className="bank-app-link"
          href={href}
          aria-label={launchLabel}
          title={launchLabel}
          target={webApp ? '_blank' : undefined}
          rel={webApp ? 'noopener noreferrer' : undefined}
          referrerPolicy="no-referrer"
          onClick={(event) => {
            if (
              !webApp &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              event.button === 0
            )
              onLaunch(app);
          }}
        >
          {label}
          <LaunchIcon className="bank-launch-icon" size={14} aria-hidden="true" />
        </a>
      ) : (
        label
      )}
    </div>
  );
}
