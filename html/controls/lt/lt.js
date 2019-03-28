function prepareLtTable(element, teamId, mode) {

	'use strict';
	$(initialize);

	var teamName = "";
	function initialize() {

		if (mode != 'plt') {
			WS.Register(['ScoreBoard.Team(' + teamId + ').Name'], function () { teamNameUpdate(); });
			WS.Register(['ScoreBoard.Team(' + teamId + ').AlternateName(operator).Name'], function () { teamNameUpdate(); });
	
			WS.Register(['ScoreBoard.Team(' + teamId + ').Color'], function (k, v) {
				element.find('#head').css('background-color', WS.state['ScoreBoard.Team(' + teamId + ').Color(operator_bg)']);
				element.find('#head').css('color', WS.state['ScoreBoard.Team(' + teamId + ').Color(operator_fg)']);
			});
		}
		
		WS.Register(['ScoreBoard.CurrentPeriodNumber'], function(k, v) { createPeriod(v); });
	}
	
	function teamNameUpdate() {
		teamName = WS.state['ScoreBoard.Team(' + teamId + ').Name'];

		if (WS.state['ScoreBoard.Team(' + teamId + ').AlternateName(operator).Name'] != null) {
			teamName = WS.state['ScoreBoard.Team(' + teamId + ').AlternateName(operator).Name']
		}

		element.find('#head .Team').text(teamName);
	}
	
	function createPeriod(nr) {
		if (nr > 0 && element.find('table.Period[nr='+nr+']').length == 0) {
			createPeriod(nr-1);
			var table = $('<table cellpadding="0" cellspacing="0" border="1">')
				.addClass('Period LT').attr('nr', nr);
			if (mode == 'plt') {
				table.prependTo(element);
			} else {
				table.appendTo(element);
			}
			if (mode != 'plt') {
				$('<div>').html('<span class ="Team">' + teamName + '</span> P' + nr)
					.prop('id','head').insertBefore(table);
				var header = $('<thead>').appendTo(table);
				var row = $('<tr>').appendTo(header);
				$('<td>').addClass('JamNumber').text('Jam').appendTo(row);
				$('<td>').addClass('NP').text('NP').appendTo(row);
				$('<td>').addClass('Skater').text('Jammer').appendTo(row);
				$('<td>').addClass('Box').text('Box').appendTo(row);
				$('<td>').addClass('Skater').text('Pivot').appendTo(row);
				$('<td>').addClass('Box').text('Box').appendTo(row);
				$('<td>').addClass('Skater').text('Blocker').appendTo(row);
				$('<td>').addClass('Box').text('Box').appendTo(row);
				$('<td>').addClass('Skater').text('Blocker').appendTo(row);
				$('<td>').addClass('Box').text('Box').appendTo(row);
				$('<td>').addClass('Skater').text('Blocker').appendTo(row);
				$('<td>').addClass('Box').text('Box').appendTo(row);
			}
			var body = $('<tbody>').appendTo(table);
			
			WS.Register(['ScoreBoard.Period('+nr+').CurrentJamNumber'], function(k, v) { createJam(nr, v); });
			
			if (mode == 'plt') {
				var jamRow = $('<tr>').addClass('Jam').attr('id', 'upcoming');
				var jamBox = $('<td>').addClass('JamNumber Darker').appendTo(jamRow);
				var npBox = $('<td>').addClass('NP Darker').appendTo(jamRow);
				$.each( [ "Jammer", "Pivot", "Blocker1", "Blocker2", "Blocker3" ], function() {
					var pos = String(this);
					var numBox = $('<td>').addClass('Skater '+pos).click(function() { 
						openFieldingEditor(nr, jamBox.text(), teamId, pos, true);
					}).appendTo(jamRow);
					var boxBox = $('<td>').addClass('Box Box'+pos).click(function() {
						openFieldingEditor(nr, jamBox.text(), teamId, pos, true);
					}).appendTo(jamRow);
					
					WS.Register(['ScoreBoard.Team('+teamId+').Position('+pos+').Number'], function (k, v) { numBox.text(v); });
					WS.Register(['ScoreBoard.Team('+teamId+').Position('+pos+').CurrentBoxSymbols'], function (k, v) { boxBox.text(v); });
				});
				
				WS.Register(['ScoreBoard.InJam', 'ScoreBoard.CurrentPeriodNumber'], function() {
					jamRow.toggleClass('Hide', isTrue(WS.state['ScoreBoard.InJam']) || WS.state['ScoreBoard.CurrentPeriodNumber'] != nr);
				});

				WS.Register(['ScoreBoard.UpcomingJamNumber'], function (k, v) { jamBox.text(v); });
				WS.Register(['ScoreBoard.Team('+teamId+').NoPivot'], function(k, v) { npBox.text(isTrue(v)?'X':''); });
				
				jamRow.prependTo(body);
				$('<tr>').addClass('Hide').prependTo(body); // even number of rows needed for coloring to fit
			}
		}
	}
	
	function createJam(p, nr) {
		var table = element.find('table.Period[nr='+p+']').find('tbody');
		if (table.find('tr.Jam[nr='+nr+']').length == 0) {
			if (nr > 1 && table.find('tr.SP[nr='+(nr-1)+']').length == 0) {	createJam(p, nr-1); }

			var prefix = 'ScoreBoard.Period('+p+').Jam('+nr+').TeamJam('+teamId+').';

			var jamRow = $('<tr>').addClass('Jam').attr('nr', nr);
			$('<td>').addClass('JamNumber Darker').text(nr).appendTo(jamRow);
			$('<td>').addClass('NP Darker').click(function() { WS.Set(prefix+'NoPivot', $(this).text() == ""); }).appendTo(jamRow);
			$.each( [ "Jammer", "Pivot", "Blocker1", "Blocker2", "Blocker3" ], function() {
				var pos = String(this);
				$('<td>').addClass('Skater '+pos).click(function() { openFieldingEditor(p, nr, teamId, pos); }).appendTo(jamRow);
				$('<td>').addClass('Box Box'+pos).click(function() { openFieldingEditor(p, nr, teamId, pos); }).appendTo(jamRow);
			});

			var spRow = jamRow.clone(true).removeClass('Jam').addClass('SP Hide');
			spRow.find('.Jammer').insertAfter(spRow.find('.BoxPivot'));
			spRow.find('.BoxJammer').insertAfter(spRow.find('.Jammer'));
			WS.Register(['ScoreBoard.Period('+p+').Jam('+nr+').StarPass'], function(k, v) { spRow.toggleClass('Hide', !isTrue(v)); });

			WS.Register([prefix+'NoPivot'], function(k, v) { jamRow.find('.NP').text(isTrue(v)?'X':''); });
			WS.Register([prefix+'StarPass'], function(k, v) {
				if (k != prefix+'StarPass') { return; } // StarPassTrip
				spRow.find('.JamNumber').text(isTrue(v)?'SP':'SP*');
				spRow.find('.NP').text(isTrue(v)?'X':'');
				$.each( [ "Jammer", "Pivot", "Blocker1", "Blocker2", "Blocker3" ], function() {
					var pos = String(this);
					spRow.find('.'+pos).text(isTrue(v)?WS.state[prefix+'Fielding('+pos+').SkaterNumber']:'');
					spRow.find('.Box'+pos).text(isTrue(v)?WS.state[prefix+'Fielding('+pos+').BoxTripSymbolsAfterSP']:'');
				});
			});
			$.each( [ "Jammer", "Pivot", "Blocker1", "Blocker2", "Blocker3" ], function() {
				var pos = String(this);
				WS.Register([prefix+'Fielding('+pos+').SkaterNumber'], function (k, v) {
					jamRow.find('.'+pos).text(v);
					if (isTrue(WS.state[prefix+'StarPass'])) { spRow.find('.'+pos).text(v); }
				});
				WS.Register([prefix+'Fielding('+pos+').BoxTripSymbolsBeforeSP'], function (k, v) {
					jamRow.find('.Box'+pos).text(v);
				});
				WS.Register([prefix+'Fielding('+pos+').BoxTripSymbolsAfterSP'], function (k, v) {
					if (isTrue(WS.state[prefix+'StarPass'])) { spRow.find('.Box'+pos).text(v); }
				});
				WS.Register([prefix+'Fielding('+pos+').Skater', prefix+'Fielding('+pos+').NotFielded',
					prefix+'Fielding('+pos+').SitFor3', prefix+'Fielding('+pos+').Id']);

			});
			
			if (mode=='plt') {
				table.find('#upcoming').after(jamRow).after(spRow);
			} else {
				table.append(jamRow).append(spRow);
			}
		}
	}
}	

var fieldingEditor;

function openFieldingEditor(p, j, t, pos, upcoming = false) {
	var prefix = 'ScoreBoard.'+(upcoming?'':'Period('+p+').')+'Jam('+j+').TeamJam('+t+').Fielding('+pos+').';
	
	fieldingEditor.dialog('option', 'title', 'Period ' + p + ' Jam ' + j + ' ' + (pos));
	var skaterField = fieldingEditor.find('#skater').val(WS.state[prefix+'Skater']);
	var notFieldedField = fieldingEditor.find('#notFielded').prop('checked', isTrue(WS.state[prefix+'NotFielded']));
	var sitFor3Field = fieldingEditor.find('#sitFor3').prop('checked', isTrue(WS.state[prefix+'SitFor3']));
	fieldingEditor.find('.BoxTrip').addClass('Hide');
	fieldingEditor.find('.'+WS.state[prefix+'Id']).removeClass('Hide');
	fieldingEditor.find('#addTrip, #submit').unbind('click');
	fieldingEditor.find('#addTrip').click(function() {
		WS.Set(prefix+'AddBoxTrip', true);
	});
	fieldingEditor.find('#submit').click(function() {
		WS.Set(prefix+'Skater', skaterField.val());
		WS.Set(prefix+'NotFielded', isTrue(notFieldedField.prop('checked')));
		WS.Set(prefix+'SitFor3', isTrue(sitFor3Field.prop('checked')));
		fieldingEditor.dialog('close');
	});
	
	fieldingEditor.dialog('open');
}

function prepareFieldingEditor(teamId) {
	
	'use strict';
	$(initialize);

	function initialize() {
		var table = $('<table>').appendTo($('#FieldingEditor'));
		var row = $('<tr>').addClass('Skater').appendTo(table);
		$('<td>').append($('<select>').attr('id', 'skater').append($('<option>').attr('value', '').text('None/Unknown'))).appendTo(row);
		$('<td>').append($('<input type=checkbox>').attr('id', 'notFielded')).append($('<span>').text('No Skater fielded')).appendTo(row);
		$('<td>').append($('<input type=checkbox>').attr('id', 'sitFor3')).append($('<span>').text('Sit out next 3')).appendTo(row);
		row = $('<tr>').addClass('tripHeader').appendTo(table);
		$('<td>').attr('colspan', '2').text('Box Trips').appendTo(row);
		$('<td>').appendTo(row);
		row = $('<tr>').addClass('tripHeader').appendTo(table);
		$('<td>').text('Start').appendTo(row);
		$('<td>').text('End').appendTo(row);
		$('<td>').appendTo(row);
		row = $('<tr>').attr('id', 'tripFooter').appendTo(table);
		$('<td>').append($('<button>').attr('id', 'addTrip').text('Add Box Trip')).appendTo(row);
		$('<td>').addClass('ButtonCell').append($('<button>').attr('id', 'abort').text('Abort')).click(function() {
			fieldingEditor.dialog('close');
		}).appendTo(row);
		$('<td>').addClass('ButtonCell').append($('<button>').attr('id', 'submit').text('Submit')).appendTo(row);
		
		WS.Register(['ScoreBoard.Team('+teamId+').Skater'], function(k,v) { processSkater(k,v); })
		WS.Register(['ScoreBoard.Team('+teamId+').BoxTrip'], function(k,v) { processBoxTrip(k,v); })

		fieldingEditor = $('#FieldingEditor').dialog({
			modal: true,
			closeOnEscape: false,
			title: 'Fielding Editor',
			autoOpen: false,
			width: '450px',
		});
	}		
	
	function processSkater(k, v) {
		var match = (k || "").match(/Skater\(([^\)]+)\)\.Number/);
		if (match == null || match.length == 0)
			return;

		var id = match[1];
		var option = $(".FieldingEditor #skater option[value='"+id+"']")
		if (v != null && option.length == 0) {
			$('<option>').attr('value', id).text(v).appendTo($('#FieldingEditor #skater'));
		} else if (v == null) {
			option.remove();
		} else {
			option.text(v);
		}
	}
	
	function processBoxTrip(k, v) {
		var match = (k || "").match(/BoxTrip\(([^\)]+)\)\.([^\(]+)/);
		if (match == null || match.length == 0)
			return;

		var id = match[1];
		var key = match[2];
		var prefix = 'ScoreBoard.Team('+teamId+').BoxTrip('+id+').';
		
		var row = $('#FieldingEditor .BoxTrip[id='+id+']');
		if (v != null && row.length == 0) {
			row = $('<tr>').addClass('BoxTrip').attr('id', id).insertBefore('#FieldingEditor #tripFooter');
			$('<td>').append($('<button>').addClass('tripModify').text('-').click(function() {
				WS.Set(prefix+'StartEarlier', true);
			})).append($('<span>').addClass('tripStartText'))
			.append($('<button>').addClass('tripModify').text('+').click(function() {
				WS.Set(prefix+'StartLater', true);
			})).appendTo(row);
			$('<td>').append($('<button>').addClass('tripModify').text('-').click(function() {
				WS.Set(prefix+'EndEarlier', true);
			})).append($('<span>').addClass('tripEndText').text('ongoing'))
			.append($('<button>').addClass('tripModify').text('+').click(function() {
				WS.Set(prefix+'EndLater', true);
			})).appendTo(row);
			$('<td>').addClass('Col3').append($('<button>').addClass('tripRemove').text('Remove').click(function() {
				WS.Set(prefix+'Delete', true);
			})).appendTo(row);
		}
		if (v == null) {
			if (key == 'Id') {
				row.remove();
			}
			if (key == 'Fielding') {
				row.removeClass(v);
			}
			return;
		}
		if (['StartJamNumber', 'StartBetweenJams', 'StartAfterSP'].includes(key)) {
			var between = isTrue(WS.state[prefix+'StartBetweenJams']);
			var afterSP = isTrue(WS.state[prefix+'StartAfterSP']);
			row.find('.tripStartText').text((between?'Before ':'') + 'Jam ' + WS.state[prefix+'StartJamNumber']
					+ (afterSP?' after SP':''));
		}
		if (['EndJamNumber', 'EndBetweenJams', 'EndAfterSP'].includes(key)) {
			var between = isTrue(WS.state[prefix+'EndBetweenJams']);
			var afterSP = isTrue(WS.state[prefix+'EndAfterSP']);
			row.find('.tripEndText').text((between?'Before ':'') + 'Jam ' + WS.state[prefix+'EndJamNumber']
					+ (afterSP?' after SP':''));
		}
		if (key == 'Fielding') {
			row.addClass(v);
		}
	}
}
