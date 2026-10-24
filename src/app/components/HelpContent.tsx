import { ArrowRightLeft, ImagePlus, Search } from 'lucide-react';

export function HelpContent() {
  return (
    <div className="help-content">
      <p>Сравните кэшбек своих банков и выберите карту, которой выгоднее оплатить покупку.</p>
      <div>
        <ImagePlus />
        <section>
          <h3>Добавьте свои банки</h3>
          <p>
            Загрузите скриншот из банка с категориями кэшбека и процентами. Проверьте результат или
            добавьте предложения вручную.
          </p>
        </section>
      </div>
      <div>
        <Search />
        <section>
          <h3>Найдите выгодную карту</h3>
          <p>
            Перед покупкой найдите категорию и сравните проценты всех банков. Кэшбек на все покупки
            выделен и всегда сверху.
          </p>
        </section>
      </div>
      <div>
        <ArrowRightLeft />
        <section>
          <h3>Перенесите свой набор</h3>
          <p>
            Через «Данные» сохраните копию для другого устройства. Она также поможет восстановить
            записи после очистки браузера.
          </p>
        </section>
      </div>
      <p className="help-legal">
        Условия кэшбека проверяйте в банке.
        <br />
        <span className="help-links">
          <a href="/legal/privacy.html" target="_blank" rel="noreferrer">
            Приватность
          </a>
        </span>
      </p>
    </div>
  );
}
