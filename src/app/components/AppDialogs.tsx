import { Check, Trash2 } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { OfferForm } from '../../features/offers/components/OfferForm';
import { UploadForm } from '../../features/recognition/components/UploadForm';
import { DataTransfer } from '../../features/backup/components/DataTransfer';
import type { Offer, OfferInput } from '../../features/offers/model/offers';
import { HelpContent } from './HelpContent';

export type AppDialog =
  { type: 'manual'; offer?: Offer } | { type: 'upload' | 'help' | 'clear' | 'data' } | null;

interface DialogActions {
  save: (inputs: OfferInput[], id?: string) => boolean;
  remove: (id: string) => boolean;
  clear: () => boolean;
  importOffers: (incoming: Offer[]) => boolean;
}
interface AppDialogsProps {
  dialog: AppDialog;
  offers: readonly Offer[];
  banks: string[];
  actions: DialogActions;
  onClose: () => void;
  onManual: () => void;
}

export function AppDialogs({ dialog, offers, banks, actions, onClose, onManual }: AppDialogsProps) {
  if (!dialog) return null;
  switch (dialog.type) {
    case 'manual':
      return (
        <Modal
          title={dialog.offer ? 'Редактировать категорию' : 'Добавить категорию'}
          subtitle="Пара деталей — и предложение в вашем наборе."
          onClose={onClose}
        >
          <OfferForm
            key={dialog.offer?.id ?? 'new'}
            offer={dialog.offer}
            banks={banks}
            onSave={(value, id) => actions.save([value], id)}
            onClose={onClose}
          />
          {dialog.offer && (
            <button
              className="text-button delete-offer"
              aria-label={`Удалить ${dialog.offer.category}, ${dialog.offer.bank}`}
              onClick={() => {
                if (actions.remove(dialog.offer!.id)) onClose();
              }}
            >
              <Trash2 size={16} />
              Удалить предложение
            </button>
          )}
        </Modal>
      );
    case 'upload':
      return (
        <Modal
          title="Добавить из скриншота"
          subtitle="Категории вашего банка — без лишнего ввода."
          wide
          onClose={onClose}
        >
          <UploadForm banks={banks} onSave={actions.save} onClose={onClose} onManual={onManual} />
        </Modal>
      );
    case 'data':
      return (
        <Modal
          title="Импорт и экспорт"
          subtitle="Переносите свой кэшбек между устройствами."
          onClose={onClose}
        >
          <DataTransfer offers={offers} onClose={onClose} onImport={actions.importOffers} />
        </Modal>
      );
    case 'clear':
      return (
        <Modal
          title="Очистить все записи?"
          subtitle="Все категории и банки будут удалены с этого устройства. Восстановить их можно только из ранее сохранённого JSON-файла."
          onClose={onClose}
        >
          <div className="modal-actions">
            <button className="button secondary" onClick={onClose}>
              Отмена
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (actions.clear()) onClose();
              }}
            >
              Удалить всё
            </button>
          </div>
        </Modal>
      );
    case 'help':
      return (
        <Modal
          title="Всё о вашем кэшбеке"
          subtitle="Небольшой помощник для повседневных покупок."
          onClose={onClose}
        >
          <HelpContent />
          <button className="button primary full-width" onClick={onClose}>
            Всё понятно <Check size={17} />
          </button>
        </Modal>
      );
  }
}
