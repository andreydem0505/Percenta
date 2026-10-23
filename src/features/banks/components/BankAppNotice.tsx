import { rememberIosBankAppLink } from '../services/app-links';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { iosBankAppLinks, mobilePlatform, type BankApp } from '../model/bank-apps';

export function BankAppNotice({ app, onClose }: { app: BankApp; onClose: () => void }) {
  const android =
    mobilePlatform(navigator.userAgent, navigator.maxTouchPoints, navigator.platform) === 'android';
  const links = android ? [] : iosBankAppLinks(app);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === 'hidden') onClose();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', onClose);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', onClose);
    };
  }, [onClose]);
  return (
    <div className="bank-launch-notice" role="status">
      <div>
        <p>Приложение не открылось?</p>
        <p className="bank-launch-help">
          {links.length > 1
            ? 'Выберите установленную версию. Выбор запомнится на устройстве.'
            : 'Проверьте, что приложение установлено, и разрешите его открытие в браузере.'}
        </p>
        {links.length > 1 && (
          <div className="bank-launch-versions">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="text-button"
                referrerPolicy="no-referrer"
                onClick={() => {
                  rememberIosBankAppLink(app, link.id);
                  onClose();
                }}
              >
                Открыть {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
      <button
        className="icon-button"
        aria-label="Скрыть подсказку открытия банка"
        onClick={onClose}
      >
        <X size={18} />
      </button>
    </div>
  );
}
