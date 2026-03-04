// rowspanの値を動的に比較して、大きい方のセルの最下行に下線を引く
document.addEventListener('DOMContentLoaded', () => {
	const tables = document.querySelectorAll('.tbl-service-doc');
	
	tables.forEach(table => {
		const tbodyList = table.querySelectorAll('tbody');
		if (tbodyList.length === 0) return;
		
		// 各tbodyを独立して処理（rowspanはtbodyをまたぐことができないため）
		tbodyList.forEach(tbody => {
			const rows = Array.from(tbody.querySelectorAll('tr'));
			
			/**
			 * @typedef {Object} RowspanData
			 * @property {HTMLTableCellElement} cell
			 * @property {number} rowspan
			 * @property {number} startRow
			 * @property {number} endRow
			 */
			/** @type {RowspanData[]} */
			const allRowspanData = []; // すべてのrowspanセルの情報を保存
			
			// すべてのrowspanセルを収集（開始行のみ）
			rows.forEach((row, rowIndex) => {
				const cells = Array.from(row.querySelectorAll('td[rowspan], th[rowspan]'));
				
				cells.forEach(cell => {
					const rowspanAttr = cell.getAttribute('rowspan');
					if (rowspanAttr) {
						const rowspan = parseInt(rowspanAttr, 10);
						const endRowIndex = rowIndex + rowspan - 1;
						allRowspanData.push({
							cell: cell,
							rowspan: rowspan,
							startRow: rowIndex,
							endRow: endRowIndex
						});
					}
				});
			});
			
			// 各行で、その行に存在するすべてのrowspanセル（新規開始と継続中の両方）を収集し、最大のrowspanを持つセルを特定
			const cellsToMark = new Set();
			
			rows.forEach((row, rowIndex) => {
				/** @type {RowspanData[]} */
				const rowRowspans = [];
				
				// この行で開始するrowspanセル
				allRowspanData.forEach(data => {
					if (data.startRow === rowIndex) {
						rowRowspans.push(data);
					}
				});
				
				// この行で継続中のrowspanセル（前の行で開始し、この行でも有効）
				allRowspanData.forEach(data => {
					if (data.startRow < rowIndex && data.endRow >= rowIndex) {
						rowRowspans.push(data);
					}
				});
				
				// この行で最大のrowspanを持つセルを特定
				if (rowRowspans.length > 0) {
					const maxRowspan = Math.max(...rowRowspans.map(r => r.rowspan));
					const maxCells = rowRowspans.filter(r => r.rowspan === maxRowspan);
					
					// 最大のrowspanを持つセルの中で、その開始行で最大のrowspanを持つセルだけをマーク
					maxCells.forEach(data => {
						// このセルの開始行で、すべてのrowspanセルを確認
						const startRowRowspans = allRowspanData.filter(d => d.startRow === data.startRow);
						const startRowMaxRowspan = Math.max(...startRowRowspans.map(r => r.rowspan));
						
						if (data.rowspan === startRowMaxRowspan) {
							cellsToMark.add(data.cell);
						}
					});
				}
			});
			
			// マークしたセルにクラスを追加
			cellsToMark.forEach(cell => {
				cell.classList.add('js-rowspan-bottomLine');
			});
		});
	});
});

