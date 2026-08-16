const snake = (rows, cols, reverse = false) => {
  const path = [];
  for (let row = 0; row < rows; row += 1) {
    const columns = Array.from({ length: cols }, (_, column) => column);
    if (row % 2 === 1) columns.reverse();
    columns.forEach((column) => path.push([row, column]));
  }
  return reverse ? path.reverse() : path;
};

const columnSnake = (rows, cols, reverse = false) => {
  const path = [];
  for (let column = 0; column < cols; column += 1) {
    const rowList = Array.from({ length: rows }, (_, row) => row);
    if (column % 2 === 1) rowList.reverse();
    rowList.forEach((row) => path.push([row, column]));
  }
  return reverse ? path.reverse() : path;
};

const spiral = (rows, cols) => {
  const path = [];
  let top = 0;
  let bottom = rows - 1;
  let left = 0;
  let right = cols - 1;
  while (top <= bottom && left <= right) {
    for (let column = left; column <= right; column += 1) path.push([top, column]);
    top += 1;
    for (let row = top; row <= bottom; row += 1) path.push([row, right]);
    right -= 1;
    if (top <= bottom) {
      for (let column = right; column >= left; column -= 1) path.push([bottom, column]);
      bottom -= 1;
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row -= 1) path.push([row, left]);
      left += 1;
    }
  }
  return path;
};

const level = (title, rows, cols, solution, group, parBacktracks = 0) => ({
  title,
  rows,
  cols,
  solution,
  group,
  parBacktracks,
});

export const levels = [
  level("Первый след", 3, 3, snake(3, 3), "Искра"),
  level("Поворот", 3, 4, spiral(3, 4), "Искра"),
  level("Лесенка", 4, 4, columnSnake(4, 4), "Искра"),
  level("Тихая волна", 4, 4, snake(4, 4, true), "Искра"),
  level("Виток", 4, 4, spiral(4, 4), "Искра"),
  level("Полярность", 4, 5, columnSnake(4, 5, true), "Искра"),

  level("Разрыв", 4, 4, [[0,0],[0,1],[0,2],[0,3],[1,3],[1,2],[2,2],[2,3],[3,3],[3,2],[3,1],[2,1],[2,0],[3,0]], "Контур", 1),
  level("Скоба", 5, 4, [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[2,2],[1,2],[1,1],[2,1],[2,0],[3,0],[4,0],[4,1],[3,1],[3,2],[4,2],[4,3],[3,3]], "Контур", 1),
  level("Две башни", 5, 4, [[4,0],[3,0],[2,0],[1,0],[0,0],[0,1],[1,1],[2,1],[2,2],[1,2],[0,2],[0,3],[1,3],[2,3],[3,3],[4,3],[4,2],[3,2],[3,1],[4,1]], "Контур", 1),
  level("Карман", 5, 5, [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[1,3],[2,3],[2,4],[3,4],[4,4],[4,3],[3,3],[3,2],[4,2],[4,1],[3,1],[2,1],[2,2],[1,2],[1,1],[1,0],[2,0],[3,0],[4,0]], "Контур", 1),
  level("Орбита", 5, 5, spiral(5, 5), "Контур", 1),
  level("Маяк", 5, 4, snake(5, 4, true), "Контур", 1),

  level("Импульс", 5, 5, columnSnake(5, 5), "Импульс", 2),
  level("Лабиринт", 5, 5, [[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[3,1],[2,1],[1,1],[1,2],[2,2],[3,2],[4,2],[4,3],[3,3],[2,3],[1,3],[1,4],[2,4],[3,4],[4,4]], "Импульс", 2),
  level("Сигнал", 6, 5, snake(6, 5), "Импульс", 2),
  level("Резонанс", 6, 5, spiral(6, 5), "Импульс", 2),
  level("Ночной ток", 6, 6, columnSnake(6, 6, true), "Импульс", 2),
  level("Бесконечный свет", 6, 6, spiral(6, 6), "Импульс", 2),
].map((item, index) => ({ ...item, id: index + 1 }));

export const keyFor = ([row, column]) => `${row}:${column}`;
