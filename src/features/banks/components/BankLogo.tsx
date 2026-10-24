import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { findBank } from '../model/banks';
import { BANK_LOGOS_ENABLED } from '../model/logo-visibility';

export function BankLogo({
  bank,
  enabled = BANK_LOGOS_ENABLED,
}: {
  bank: string;
  enabled?: boolean;
}) {
  if (!enabled) return null;
  return <BankLogoImage bank={bank} />;
}

function BankLogoImage({ bank }: { bank: string }) {
  const logo = findBank(bank)?.logo;
  const [failed, setFailed] = useState<string>();
  return (
    <span className="bank-badge" aria-hidden="true">
      {logo && failed !== logo ? (
        <img
          src={`${import.meta.env.BASE_URL}${logo}`}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(logo)}
        />
      ) : (
        <Landmark size={14} />
      )}
    </span>
  );
}
