import { CircleHelp, FileJson } from 'lucide-react';
import { BrandMark } from '../../shared/ui/BrandMark';

export function AppHeader({
  onHome,
  onData,
  onHelp,
}: {
  onHome: () => void;
  onData: () => void;
  onHelp: () => void;
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
          aria-label="Aubenia — на главную"
        >
          <BrandMark className="brand-icon" />
          <span>Aubenia</span>
        </a>

        <div className="header-right">
          <button
            className="text-button data-button"
            aria-label="Импорт и экспорт данных"
            onClick={onData}
          >
            <FileJson size={18} /> Данные
          </button>
          <button
            className="icon-button help-button"
            aria-label="Как это работает"
            onClick={onHelp}
          >
            <CircleHelp size={21} />
          </button>
        </div>
      </div>
    </header>
  );
}
