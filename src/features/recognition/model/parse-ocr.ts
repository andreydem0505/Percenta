export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface OcrWord {
  text: string;
  bbox: Box;
  confidence?: number;
}
export interface OcrLine {
  words: OcrWord[];
  bbox: Box;
}
export interface OcrDraft {
  category: string;
  percent: string;
  uncertain: boolean;
}
interface Anchor {
  bbox: Box;
  percent: string;
  confidence: number;
}
interface Label {
  text: string;
  bbox: Box;
  confidence: number;
}
const x = (b: Box) => (b.x0 + b.x1) / 2;
const y = (b: Box) => (b.y0 + b.y1) / 2;
const height = (b: Box) => Math.max(1, b.y1 - b.y0);
const merge = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});
const uiText =
  /^(?:до|от|выбрано|выбрать|выбраны|активно|активные|активировать|готово|подключить|изменить|подробнее|назад|далее|все|категории|категории к[эе]шб[эе]ка|повышенный к[эе]шб[эе]к|к[эе]шб[эе]к|к[эе]шб[эе]к на (?:октябрь|ноябрь|декабрь|январь|февраль|март|апрель|май|июнь|июль|август|сентябрь))$/i;
const sectionText =
  /^(?:к[эе]шб[эе]к\s+(?:по|при|в)(?:\s|$)|выгода\s+в(?:\s|$)|свои плюсы$|и\s+(?:на|ha)\s+кассе$)/i;

/** Geometry is retained: flattening text loses the relationship between cards. */
export function parseOcr(lines: OcrLine[]): OcrDraft[] {
  const anchors: Anchor[] = [];
  const labels: Label[] = [];
  for (const line of lines) {
    const textHeights = line.words
      .filter((word) => /[а-яёa-z]/i.test(word.text))
      .map((word) => height(word.bbox))
      .sort((a, b) => a - b);
    const textHeight = textHeights[Math.floor((textHeights.length - 1) / 2)];
    let group: OcrWord[] = [];
    const flush = () => {
      if (!group.length) return;
      const text = group
        .map((w) => w.text)
        .join(' ')
        .replace(/^[\s:;•·—–-]+|[\s:;•·—–-]+$/g, '')
        .trim();
      if (
        /[а-яёa-z]/i.test(text) &&
        !uiText.test(text) &&
        !sectionText.test(text) &&
        !/^\d/.test(text) &&
        !/₽|руб\.?|баллов|лимит|выберите|не выбраны|не активны|настрой|месяц|[0-9]:[0-9]/i.test(
          text,
        )
      ) {
        labels.push({
          text,
          bbox: group.map((w) => w.bbox).reduce(merge),
          confidence: Math.min(...group.map((w) => w.confidence ?? 90)),
        });
      }
      group = [];
    };
    for (let i = 0; i < line.words.length; i++) {
      const word = line.words[i];
      // Illustrations may be read as a giant «с» or «Bs». Their square bounds
      // are several times taller than the actual category on the same row.
      if (
        textHeight &&
        word.text.replace(/[^а-яёa-z0-9]/gi, '').length <= 3 &&
        height(word.bbox) > textHeight * 1.8 &&
        (word.bbox.x1 - word.bbox.x0) / height(word.bbox) > 0.5
      )
        continue;
      let token = word.text.replace(/^[©®@⊕⊗✚]+/u, '');
      if (!token || /^[=<>|~©®@]+$/.test(token) || (token === '+' && !group.length)) continue;
      let bbox = word.bbox;
      if (/^\d{1,3}(?:[.,]\d{1,2})?$/.test(token) && line.words[i + 1]?.text === '%') {
        token += '%';
        bbox = merge(bbox, line.words[++i].bbox);
      }
      const match = token.match(/^(\d{1,3}(?:[.,]\d{1,2})?)\s*%$/);
      if (match) {
        flush();
        const percent = Number(match[1].replace(',', '.'));
        const qualified = /^(до|от)$/i.test(line.words[i - 1]?.text ?? '');
        if (percent <= 100)
          anchors.push({
            bbox,
            percent: String(percent),
            confidence: qualified ? 60 : (word.confidence ?? 90),
          });
      } else if (token !== '%' && token.toLowerCase() !== 'до') {
        if (
          group.length &&
          word.bbox.x0 - group[group.length - 1].bbox.x1 > Math.max(36, height(word.bbox) * 2.2)
        )
          flush();
        group.push({ ...word, text: token });
      }
    }
    flush();
  }
  anchors.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  // Join wrapped labels in a card, but never merge two separate list rows.
  labels.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  for (let i = 0; i < labels.length; i++) {
    const first = labels[i];
    for (let j = i + 1; j < labels.length; j++) {
      const second = labels[j];
      const gap = second.bbox.y0 - first.bbox.y1;
      const aligned =
        Math.abs(second.bbox.x0 - first.bbox.x0) < 22 ||
        Math.abs(x(second.bbox) - x(first.bbox)) < 22;
      const nearbyAnchors = anchors.filter(
        (a) =>
          y(a.bbox) >= y(first.bbox) - height(a.bbox) * 0.5 &&
          y(a.bbox) <= y(second.bbox) + height(a.bbox) * 0.5,
      );
      if (
        gap >= -2 &&
        gap <= Math.max(8, height(second.bbox) * 0.65) &&
        aligned &&
        Math.max(height(first.bbox), height(second.bbox)) <=
          Math.min(height(first.bbox), height(second.bbox)) * 1.6 &&
        nearbyAnchors.length <= 1
      ) {
        first.text += ` ${second.text}`;
        first.bbox = merge(first.bbox, second.bbox);
        first.confidence = Math.min(first.confidence, second.confidence);
        labels.splice(j--, 1);
      }
    }
  }
  const used = new Set<Label>();
  return anchors.map((anchor) => {
    const rowAnchors = anchors.filter(
      (other) =>
        Math.abs(y(other.bbox) - y(anchor.bbox)) <
        Math.max(height(anchor.bbox), height(other.bbox)),
    );
    const left = rowAnchors
      .filter((a) => x(a.bbox) < x(anchor.bbox))
      .sort((a, b) => x(b.bbox) - x(a.bbox))[0];
    const right = rowAnchors
      .filter((a) => x(a.bbox) > x(anchor.bbox))
      .sort((a, b) => x(a.bbox) - x(b.bbox))[0];
    const candidates = labels.filter((label) => {
      if (used.has(label)) return false;
      const dy = Math.abs(y(label.bbox) - y(anchor.bbox));
      if (dy > Math.max(90, height(anchor.bbox) * 5)) return false;
      // With card grids, keep each label in its percentage's column.
      if (left && x(label.bbox) < (x(left.bbox) + x(anchor.bbox)) / 2) return false;
      if (right && x(label.bbox) > (x(right.bbox) + x(anchor.bbox)) / 2) return false;
      return true;
    });
    const score = (label: Label) => {
      const dy = Math.abs(y(label.bbox) - y(anchor.bbox));
      const sameLine = dy < Math.max(height(anchor.bbox), height(label.bbox)) * 0.6;
      const horizontalGap = Math.max(
        0,
        label.bbox.x0 - anchor.bbox.x1,
        anchor.bbox.x0 - label.bbox.x1,
      );
      return sameLine
        ? horizontalGap * 0.12
        : dy * 2 + Math.abs(x(label.bbox) - x(anchor.bbox)) * 0.6;
    };
    candidates.sort((a, b) => score(a) - score(b));
    const label = candidates[0];
    if (label) used.add(label);
    return {
      category: label?.text ?? '',
      percent: anchor.percent,
      uncertain:
        !label ||
        label.confidence < 80 ||
        anchor.confidence < 80 ||
        (candidates.length > 1 && Math.abs(score(candidates[0]) - score(candidates[1])) < 12),
    };
  });
}
