import { describe, expect, it } from 'vitest';
import { parseOcr, type OcrLine, type OcrWord } from './parse-ocr';

const word = (
  text: string,
  x: number,
  y: number,
  w = text.length * 12,
  confidence = 95,
): OcrWord => ({ text, bbox: { x0: x, x1: x + w, y0: y, y1: y + 22 }, confidence });
const line = (...words: OcrWord[]): OcrLine => ({
  words,
  bbox: {
    x0: Math.min(...words.map((w) => w.bbox.x0)),
    y0: words[0].bbox.y0,
    x1: Math.max(...words.map((w) => w.bbox.x1)),
    y1: words[0].bbox.y1,
  },
});
describe('распознавание структуры категорий', () => {
  it('отделяет названия от крупных иконок, заголовков и значков у процентов', () => {
    const icon = (text: string, top: number): OcrWord => ({
      text,
      confidence: 40,
      bbox: { x0: 60, x1: 160, y0: top - 35, y1: top + 65 },
    });
    const values = parseOcr([
      line(word('Кешбэк', 60, 100), word('по', 150, 100), word('категориям', 190, 100)),
      line(
        icon('©', 200),
        word('Яндекс', 205, 200),
        word('Лавка', 290, 200),
        word('@3%', 950, 200),
      ),
      line(
        word('Кешбэк', 60, 300),
        word('при', 150, 300),
        word('оплате', 200, 300),
        word('онлайн', 290, 300),
      ),
      line(word('и', 60, 330), word('на', 90, 330), word('кассе', 130, 330)),
      line(icon('+', 430), word('Аптеки', 205, 430), word('@', 900, 430), word('5%', 950, 430)),
      line(icon('(co)', 560), word('Электроника', 205, 560), word('®5%', 950, 560)),
      line(
        icon('=', 690),
        word('Все', 205, 690),
        word('покупки', 250, 690),
        word('на', 345, 690),
        word('кассе', 380, 690),
        word('3%', 950, 690),
      ),
      line(
        word('Кешбэк', 60, 810),
        word('в', 150, 810),
        word('Яндекс', 180, 810),
        word('Такси', 270, 810),
      ),
      line(icon('=', 930), word('Комфорт', 205, 930), word('5%', 950, 930)),
      line(icon('=', 1060), word('Комфорт+', 205, 1060), word('5%', 950, 1060)),
      line(icon('Bs', 1190), word('Ultima', 205, 1190), word('5%', 950, 1190)),
    ]);
    expect(values.map(({ category, percent }) => ({ category, percent }))).toEqual([
      { category: 'Яндекс Лавка', percent: '3' },
      { category: 'Аптеки', percent: '5' },
      { category: 'Электроника', percent: '5' },
      { category: 'Все покупки на кассе', percent: '3' },
      { category: 'Комфорт', percent: '5' },
      { category: 'Комфорт+', percent: '5' },
      { category: 'Ultima', percent: '5' },
    ]);
  });
  it('не превращает отрицательный процент и число без знака процента в предложение', () => {
    expect(parseOcr([line(word('Аптеки', 20, 30), word('-5%', 200, 30))])).toEqual([]);
    expect(parseOcr([line(word('Аптеки', 20, 30), word('5', 200, 30))])).toEqual([]);
  });
  it('отделяет ошибочно прочитанную иконку от короткого названия', () => {
    const graphic = { text: 'Bs', confidence: 40, bbox: { x0: 20, x1: 120, y0: 10, y1: 110 } };
    expect(parseOcr([line(graphic, word('АЗС', 150, 50), word('5%', 450, 50))])[0].category).toBe(
      'АЗС',
    );
  });
  it('связывает названия и проценты в списке', () => {
    const values = parseOcr([
      line(word('Супермаркеты', 20, 30), word('5%', 400, 30)),
      line(
        word('Кафе', 20, 90),
        word('и', 80, 90),
        word('рестораны', 100, 90),
        word('7,5%', 400, 90),
      ),
    ]);
    expect(values.map(({ category, percent }) => ({ category, percent }))).toEqual([
      { category: 'Супермаркеты', percent: '5' },
      { category: 'Кафе и рестораны', percent: '7.5' },
    ]);
  });
  it('разделяет сетку карточек, включая слова на общей строке', () => {
    const values = parseOcr([
      line(word('5%', 60, 20), word('10%', 380, 20)),
      line(word('Аптеки', 45, 60), word('Супермаркеты', 330, 60)),
    ]);
    expect(values.map((v) => v.category)).toEqual(['Аптеки', 'Супермаркеты']);
  });
  it('поддерживает отдельный знак процента', () => {
    expect(
      parseOcr([line(word('АЗС', 20, 30), word('10', 200, 30), word('%', 230, 30))])[0],
    ).toMatchObject({ category: 'АЗС', percent: '10' });
  });
  it('собирает название из двух строк внутри карточки', () => {
    expect(
      parseOcr([
        line(word('5%', 55, 20)),
        line(word('Кафе', 30, 60), word('и', 90, 60)),
        line(word('рестораны', 30, 88)),
      ])[0].category,
    ).toBe('Кафе и рестораны');
  });
  it('не объединяет соседние строки списка', () => {
    expect(
      parseOcr([
        line(word('Кафе', 20, 30), word('5%', 350, 30)),
        line(word('Аптеки', 20, 60), word('10%', 350, 60)),
      ]).map((v) => v.category),
    ).toEqual(['Кафе', 'Аптеки']);
  });
  it('отмечает предложение «до N%» для проверки', () => {
    expect(
      parseOcr([line(word('Аптеки', 20, 30), word('до', 200, 30), word('10%', 240, 30))])[0]
        .uncertain,
    ).toBe(true);
  });
  it('не придумывает отсутствующую категорию и отмечает сомнение', () => {
    expect(parseOcr([line(word('10%', 20, 30))])).toEqual([
      { category: '', percent: '10', uncertain: true },
    ]);
  });
  it('отмечает ненадёжные названия для проверки', () => {
    expect(parseOcr([line(word('Аптеки', 20, 30, 80, 60), word('5%', 200, 30))])[0].uncertain).toBe(
      true,
    );
  });
  it('не принимает сумму или интерфейсный текст за категорию', () => {
    expect(
      parseOcr([
        line(word('Лимит', 20, 30), word('3000', 100, 30), word('₽', 170, 30)),
        line(word('Кэшбек', 20, 80)),
        line(word('10%', 20, 130)),
      ])[0].category,
    ).toBe('');
  });
  it('возвращает пустой результат без процентов', () => {
    expect(parseOcr([line(word('Супермаркеты', 20, 30))])).toEqual([]);
    expect(parseOcr([])).toEqual([]);
  });
});
