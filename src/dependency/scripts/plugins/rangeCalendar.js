(function ($, window, document, undefined) {
  'use strict';

  var pluginName = 'rangeCalendar';

  $.fn[pluginName] = function (options) {
    this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
      } else {
        $(this).data("plugin_" + pluginName).update();
      }
    });

    return this;
  };

  (function () {
    /** 한국 ko 베트남 vi 영어 en 러시아 ru 일어 ja 중국어 zh 미얀마 my */

    var useLang = ['ko', 'ru'];
    if (useLang.indexOf(PUB.VARS.LANG) !== -1) {
      moment.locale(PUB.VARS.LANG);
    } else {
      moment.locale('en');
    }
  })();

  function Plugin(element, options) {
    var self = this;
    self.$element = $(element);
    self.$element.css('position', 'relative');

    var dateObj,
      lang = (function () {
        // 한국어, 러시아어외에는 영문으로 요일표시
        if (PUB.VARS.LANG.indexOf('ko') !== -1 || PUB.VARS.LANG.indexOf('ru') !== -1) {
          return PUB.VARS.LANG;
        } else {
          return 'en';
        }
      })(),
      format = (function () {
        var type1 = ['ko', 'ja', 'cn'];   // YYYY-MM-DD
        var type2 = ['vn', 'ru'];        // DD-MM-YYYY;

        if (_.include(type1, PUB.VARS.LANG)) {
          //한중일
          return 'YYYY-MM-DD';
        } else if (_.include(type2, PUB.VARS.LANG)) {
          //베트남, 러시아
          // return 'YYYY-MM-DD';
          return 'DD-MM-YYYY';
        } else {
          // return 'YYYY-MM-DD';
          return 'MM-DD-YYYY';
        }

      })();

    var todayData = self.$element.data('today'),
      todayDate = todayData ? new Date(todayData) : new Date();

    //element에 data attribute로 start day지정, today보다 이전날짜일 경우 today로 지정
    if (self.$element.data('start') != null) {
      var startData = self.$element.data('start'),
        startDataArr = startData.split('/'),
        startDataDate;

      if (startDataArr[0].length < 4) {
        if (format === 'YYYY-MM-DD') {
          startDataDate = startDataArr[0] + "-" + startDataArr[1] + "-" + startDataArr[2];
        } else if (format === 'DD-MM-YYYY') {
          startDataDate = startDataArr[2] + "-" + startDataArr[1] + "-" + startDataArr[0];
        } else {
          startDataDate = startDataArr[2] + "-" + startDataArr[0] + "-" + startDataArr[1];
        }
      } else {
        startDataDate = self.$element.data('start');
      }

      var momentObj = {
        today: moment(todayData, 'YYYY-MM-DD'),
        start: moment(startDataDate, 'YYYY-MM-DD')
      };

      if (moment.duration(momentObj.today.diff(momentObj.start)).asDays() > 0) {
        dateObj = todayDate;
      } else {
        dateObj = new Date(startDataDate);
      }

    } else {
      dateObj = todayDate;
    }

    var year = dateObj.getFullYear(),
      month = self.pad(dateObj.getMonth() + 1, 2),
      day = self.pad(dateObj.getDate(), 2),
      today,
      dateObj2 = new Date(dateObj.valueOf() + (24 * 60 * 60 * 1000)),
      tomorrow_year = dateObj2.getFullYear(),
      tomorrow_month = self.pad(dateObj2.getMonth() + 1, 2),
      tomorrow_day = self.pad(dateObj2.getDate(), 2),
      tomorrow,
      singleMonth = self.$element.data('singlemonth'),
      singleDate = self.$element.data('singledate'),
      mulitiInput = self.$element.data('multiinput'),
      startId = self.$element.data('startid'),    //multi type일때 첫번째 input
      endId = self.$element.data('endid'),        //multi type일때 마지막 input
      // today = year + "-" + month + "-" + day,
      title = self.$element.data('title'),
      ajax = self.$element.data('ajax'),
      endDate = null,
      selectDay = self.$element.data('selectday') ? self.$element.data('selectday').split('~') : null;

    if (format === 'YYYY-MM-DD') {
      today = year + "-" + month + "-" + day;
      tomorrow = tomorrow_year + "-" + tomorrow_month + "-" + tomorrow_day;
    } else if (format === 'DD-MM-YYYY') {
      today = day + "-" + month + "-" + year;
      tomorrow = tomorrow_day + "-" + tomorrow_month + "-" + tomorrow_year;
    } else {
      today = month + "-" + day + "-" + year;
      tomorrow = tomorrow_month + "-" + tomorrow_day + "-" + tomorrow_year;
    }

    if (self.$element.data('end') != null) {
      var endArr = self.$element.data('end').split('/');
      if (format === 'YYYY-MM-DD') {
        endDate = endArr[0] + "-" + endArr[1] + "-" + endArr[2];
      } else if (format === 'DD-MM-YYYY') {
        endDate = endArr[2] + "-" + endArr[1] + "-" + endArr[0];
      } else {
        endDate = endArr[1] + "-" + endArr[2] + "-" + endArr[0];
      }
    }

    var _default = {
      language: lang || 'en',
      format: format || 'YYYY-MM-DD',
      startDate: today,                                       // 현재 일자 기준 선택
      endDate: endDate || false,
      nextDate: tomorrow,
      selectDay: selectDay,
      minDays: 2,
      //extraClass : 'day__exclude',
      autoClose: false,                                        // 선택시 자동 닫기
      maxDays: '30',                                         // 최대 선택 일자
      showTopbar: false,
      selectForward: false,                                    // 시작일자 클릭시 이전일 disable
      singleMonth: singleMonth || false,
      singleDate: singleDate || false,
      mulitiInput: mulitiInput || false,
      startId: startId || null,
      endId: endId || null,
      //customTopBar: ' ',                                    // 상단 선택일자 표시 글
      stickyMonths: true,                                     // 고정 달력 : 월별로 별도로 이동 불가
      separator: '~',                                         // 상단 선택일자 start day + separator + end day
      showShortcuts: false,
      container: element,
      dayDivAttrs: [this.tabindexFn],
      title: title,
      ajax: ajax || false,
      ERRTOOLTIP: '예약 불가',
      ERRMSG: '예약일자는 불가일자를 포함할 수 없음'
    };

    self.options = $.extend({}, _default, options);
    self.init();
  }

  $.extend(Plugin.prototype, {
    init: function () {
      var plugin = this;
      plugin.setInstance();
      plugin.bindEvents();

      if (plugin.options.selectDay != null && plugin.options.selectDay.length > 1) {
        plugin.$input.data('dateRangePicker').setDateRange(plugin.options.selectDay[0], plugin.options.selectDay[1]);
        plugin.$input.trigger('datepicker-change');
      }
    },

    destroy: function () {
      var plugin = this;

      plugin.$input.data('dateRangePicker').destroy();
      plugin.$element
        .removeClass('calendar--opened')
        .off('keydown.calendar')
        .removeData('plugin_' + pluginName);
    },

    reset: function () {
      var plugin = this;
      var $placeholder = plugin.$input.siblings('.input__placeholder');
      if ($placeholder.length) {
        $placeholder.removeClass('screen--out')
      }
      plugin.$input.data('dateRangePicker').clear();

      if (plugin.$input.data('v-value') != null || plugin.$input.data('v-item')) {
        plugin.$input.data('v-value', '');
      }
    },

    update: function (options) {
      var plugin = this;
      // console.log('calendar update');
      plugin.disableSet(true);

      if (options && options === 'defaultDay') {
        plugin.$input.data('dateRangePicker').setStart(plugin.options.startDate);
        plugin.$input.data('dateRangePicker').setEnd(plugin.options.nextDate);
      } else if (options && options === 'selectDay') {
        if (arguments.length === 3) {
          plugin.$input.data('dateRangePicker').setStart(arguments[1]);
          plugin.$input.data('dateRangePicker').setEnd(arguments[2]);
        }
      }
    },
    //
    // showGap : function(){
    // 	var plugin = this;
    // 	plugin.$input.data('dateRangePicker').showGap();
    // },

    setInstance: function () {
      var plugin = this;
      plugin.$input = plugin.$element.find('input');

      var $required = plugin.$element.find('[data-required="required"]');
      if ($required.length) {
        plugin.$element.attr('data-required', 'required');
      }

      if (plugin.$element.data('inline')) {
        $.extend(plugin.options, {
          inline: true,
          alwaysOpen: true
        });
      }

      if (plugin.options.mulitiInput) {
        var $startInput = $('#' + plugin.options.startId);
        var $endInput = $('#' + plugin.options.endId);
        plugin.options.getValue = function () {
          if ($startInput.val() && $endInput.val())
            return $startInput.val() + ' to ' + $endInput.val();
          else
            return '';
        };
        plugin.options.setValue = function (s, s1, s2) {
          var firstClick = plugin.$input.data("dateRangePicker").getFirstSelectDay();
          var startDate = s1.replace(/-/g, '');
          if (!plugin.options.selectForward && firstClick > startDate) return;
          $startInput.val(s1);
          $endInput.val(s2);
        };
      }

      plugin.disableSet(true);
      plugin.$input.dateRangePicker(plugin.options);
    },

    bindEvents: function () {
      var plugin = this;

      plugin.$input.on('datepicker-change', {target: plugin}, plugin.disableDayCheck);
      plugin.$input.on('datepicker-opened', {target: plugin}, plugin.calOpened);
      plugin.$input.on('datepicker-change', {target: plugin}, plugin.calChange);
      plugin.$input.on('datepicker-close', {target: plugin}, plugin.calClose);
      plugin.$input.on('datepicker-closed', {target: plugin}, plugin.calClosed);
      plugin.$input.on('datepicker-next', {target: plugin}, plugin.next);
      plugin.$input.on('datepicker-prev', {target: plugin}, plugin.prev);
      plugin.$input.on('focus', {target: plugin}, plugin.openEvt);
      plugin.$input.on('keydown', {target: plugin}, plugin.inputKeydown);
      plugin.$valid = plugin.$element.find('.valid');
      //plugin.$valid.attr('tabindex','0');
      //plugin.$valid.on('keydown', plugin.enterEvent)

      plugin.$element.on('keydown.calendar', '.valid', plugin.enterEvent);
    },

    next: function (event, data) {
      var plugin = event.data.target,
        devname = plugin.options.dev,
        dateObj;

      // console.log('////////////////////////////////////////////');
      // console.log(plugin.returnDate(data.date1,'next','first'), " : " , plugin.returnDate(data.date2,'next','last'));
      // console.log('////////////////////////////////////////////');

      if (data.single) {
        dateObj = plugin.returnDate(data.date1, 'string', 'next', 'last');
      } else {
        dateObj = {
          start: plugin.returnDate(data.date1, 'string', 'next', 'first'),
          end: plugin.returnDate(data.date2, 'string', 'next', 'last')
        };
      }

      if (PUB.MD.DEV[devname]) {
        PUB.MD.DEV[devname]('calendar', function () {
          plugin.disableSet(false);
          data.callback();
        }, dateObj);
      }
    },

    prev: function (event, data) {
      var plugin = event.data.target,
        devname = plugin.options.dev,
        dateObj;

      // console.log('////////////////////////////////////////////');
      // console.log(plugin.returnDate(data.date1,'prev','first'), " : " , plugin.returnDate(data.date2,'prev','last'));
      // console.log('////////////////////////////////////////////');

      if (data.single) {
        dateObj = plugin.returnDate(data.date1, 'string', 'prev', 'last');
      } else {
        dateObj = {
          start: plugin.returnDate(data.date1, 'string', 'prev', 'first'),
          end: plugin.returnDate(data.date2, 'string', 'prev', 'last')
        };
      }

      if (PUB.MD.DEV[devname]) {
        PUB.MD.DEV[devname]('calendar', function () {
          plugin.disableSet(false);
          data.callback();
        }, dateObj);
      }
    },

    returnDate: function (date, type, str1, str2) {
      var plugin = this,
        year = date.getFullYear(),
        month = plugin.pad(date.getMonth() + 1, 2),
        prevMonth = plugin.pad(moment(date).add(-1, 'months').toDate().getMonth() + 1, 2),
        nextMonth = plugin.pad((date.getMonth() + 1) % 12 + 1, 2),
        day = plugin.pad(date.getDate(), 2),
        firstDay = plugin.pad(1, 2),
        lastDay = new Date(year, month, 0).getDate(),
        dateStr;
      // console.log(date.getMonth() + 1,moment(date).add(-1,'months').toDate().getMonth() + 1);

      if (str1 === 'prev') {
        year = moment(date).add(-1, 'months').toDate().getFullYear();
        lastDay = new Date(year, prevMonth, 0).getDate();
        dateStr = year + '/' + prevMonth;
      } else if (str1 === 'next') {
        year = moment(date).add(1, 'months').toDate().getFullYear();
        lastDay = new Date(year, nextMonth, 0).getDate();
        dateStr = year + '/' + nextMonth;
      } else {
        dateStr = year + '/' + month;
      }

      if (str2 === 'first') {
        dateStr = dateStr + '/' + firstDay;
      } else if (str2 === 'last') {
        dateStr = dateStr + '/' + lastDay;
      } else {
        if (str1) {
          dateStr = dateStr + '/' + lastDay;
        } else {
          dateStr = dateStr + '/' + day;
        }
      }

      if (type === 'number') {
        dateStr = Math.floor(dateStr.replace(/[^0-9]/g, ""));
      }
      return dateStr;
    },

    // calcDay : function (firstDate,secondDate){
    // 	var startDay = new Date(firstDate);
    // 	var endDay = new Date(secondDate);
    // 	var millisecondsPerDay = 1000 * 60 * 60 * 24;
    //
    // 	var millisBetween = startDay.getTime() - endDay.getTime();
    // 	var days = millisBetween / millisecondsPerDay;
    //
    // 	return ' (' + Math.floor(days) + opt.NIGHT + ')';
    // },

    enterEvent: function (e) {
      if (e.keyCode === 13) {
        e.stopPropagation();
        $(this).trigger('click');
      }
    },

    openEvt: function (event) {
      var plugin = event.data.target;

      if (plugin.$input.val() === '' && !plugin.$element.hasClass('calendar--opened')) {
        plugin.$input.data('dateRangePicker').open();
      }
      plugin.$element.addClass('calendar--opened');

      event.stopPropagation();
    },

    disableSet: function (redraw) {
      var plugin = this,
        disableData = plugin.$element.data('disable'),
        disableDay = [];

      if (disableData) {
        disableData = disableData.split(',');
      } else {
        disableData = '';
      }

      $.each(disableData, function (index, data) {
        var arr = data.split('/'),
          obj = {
            year: arr[0],
            month: arr[1],
            day: arr[2]
          };
        disableDay.push(obj);
        arr = null;
      });
      disableData = null;

      plugin.options.beforeShowDay = function (t) {
        var valid = true;
        var _class = '';
        var _tooltip = '';
        for (var i = 0, len = disableDay.length; i < len; i++) {
          if (t.getUTCFullYear().toString() === disableDay[i].year && plugin.pad(t.getMonth() + 1, 2).toString() === disableDay[i].month && plugin.pad(t.getDate(), 2).toString() === disableDay[i].day) {
            valid = true;
            _class = 'day--exclude';
            _tooltip = plugin.options.ERRTOOLTIP;
          }
        }
        plugin.$valid = plugin.$element.find('.valid');
        return [valid, _class, _tooltip];
      };

      if (plugin.disableDay != null) {
        plugin.$input.data('dateRangePicker').update(plugin.options.beforeShowDay, redraw);
      }

      plugin.disableDay = disableDay;
    },

    /* 시작일자 선택 후 callback */
    firstSelect: function (event, obj) {
      var plugin = event.data.target;

      if (plugin.disableDay !== undefined) {
        // console.log("month >>> " + parseInt(obj.date1.getMonth() + 1))
        // console.log("days >>> " + parseInt(obj.date1.getDate() + 1))
        // console.log(event)
        // console.log($input.data())
        for (var i = 0, len = plugin.disableDay.length; i < len; i++) {
          if (obj.date1.getUTCFullYear().toString() === plugin.disableDay[i].year &&
            pad(obj.date1.getMonth() + 1, 2).toString() === plugin.disableDay[i].month &&
            pad(obj.date1.getDate() + 1, 2).toString() === plugin.disableDay[i].day) {
            //alert("ttt")
            //$input.data('dateRangePicker').close();
            //console.log($input.data('dateRangePicker').getDatePicker())
            //$input.data('dateRangePicker').setEnd(obj.date1.getUTCFullYear().toString() + '-' + pad(obj.date1.getMonth() + 1, 2).toString() + '-' + pad(obj.date1.getDate() + 1, 2).toString())
          }
        }
        PUB.MD.DELAY_FUNC(function () {
          plugin.$invalid = plugin.$element.find('.invalid');
          plugin.$invalid.removeAttr('tabindex');
        }, 300);
      }

    },

    lastClose: function (event) {
      var plugin = event.data.target;

      if (event.keyCode === 9) {
        if (!e.shiftKey) {
          plugin.$input.data('dateRangePicker').close();
        }
      }
    },

    /* 오픈후 callback */
    calOpened: function (event) {
      var plugin = event.data.target;

      //var focusable = PUB.MD.FOCUSABLE( $el );
      //var $lastDay = $('.day.toMonth.valid').last();
      plugin.$valid = plugin.$element.find('.valid');
      plugin.$invalid = plugin.$element.find('.invalid');
      plugin.$next = plugin.$element.find('.next');
      plugin.$prev = plugin.$element.find('.prev');
      //plugin.$valid.off('keydown').on( 'keydown',  plugin.enterEvent );
      //plugin.$next.off('keydown').on( 'keydown', plugin.enterEvent );
      //plugin.$prev.off('keydown').on( 'keydown', plugin.enterEvent );
      //$lastDay.on( 'keydown', lastClose);
    },

    calChange: function (event, obj) {
      var plugin = event.data.target;
      // console.log("change check");
      var $this = $(this);
      var dateArr = $this.val().split('-');
      var val;
      /*
        if( plugin.disableDay !== undefined && obj != null) {
        var start = plugin.returnDate(obj.date1, 'number');
        var end = plugin.returnDate(obj.date2, 'number');
        if( start < end ) {
          plugin.options.autoClose = false
        }
      }*/

      var $placeholder = $this.siblings('.input__placeholder');
      if ($placeholder.length) {
        if ($.trim($this.val()) !== '') {
          $placeholder.addClass('screen--out');
        } else {
          $placeholder.removeClass('screen--out');
        }
      }

      if ($this.data('v-value') != null || $this.data('v-item')) {
        $this.data('v-value', $this.val());
      }

      //pront에 보이는 input date 때문에 val 사용금지
      if (plugin.options.format === 'YYYY-MM-DD') {
        val = dateArr[0] + "-" + dateArr[1] + "-" + dateArr[2];
      } else if (plugin.options.format === 'DD-MM-YYYY') {
        val = dateArr[2] + "-" + dateArr[1] + "-" + dateArr[0];
      } else {
        val = dateArr[2] + "-" + dateArr[0] + "-" + dateArr[1];
      }

      $this.trigger('dateChange', [$this.val()]);
    },

    inputKeydown: function (event) {
      var plugin = event.data.target;

      if (event.keyCode === 13) {
        plugin.$input.data('dateRangePicker').open();
      }
      if (event.keyCode === 9) {
        if (event.shiftKey) {
          plugin.$input.data('dateRangePicker').close();
        }
      }
      event.stopPropagation();
    },

    calClose: function () {
    },

    calViewClose: function (target) {
      target.data('dateRangePicker').close()
    },

    calClosed: function (event) {
      var plugin = event.data.target;

      plugin.$element.removeClass('calendar--opened')
    },

    disableDayCheck: function (event, obj) {
      var plugin = event.data.target;
      var exDay, start, end, current, wrongResult;

      if (plugin.disableDay !== undefined && obj != null) {
        for (var i = 0, len = plugin.disableDay.length; i < len; i++) {
          exDay = new Date(plugin.disableDay[i].year, plugin.disableDay[i].month - 1, plugin.disableDay[i].day);
          wrongResult = false;

          if (plugin.options.singleDate) {
            start = plugin.returnDate(obj.date1, 'number');
            current = plugin.returnDate(exDay, 'number');

            if (current === start) {
              wrongResult = true;
            }
          } else {
            start = plugin.returnDate(obj.date1, 'number');
            end = plugin.returnDate(obj.date2, 'number');
            current = plugin.returnDate(exDay, 'number');

            if (current >= start && current <= end) {
              if (current < end) {
                wrongResult = true;
              }
            }
          }


          if (wrongResult) {
            alert(plugin.options.ERRMSG);
            plugin.$input.data('dateRangePicker').clear();
            plugin.$input.data('dateRangePicker').close();

            if (plugin.$input.data('v-value') != null) {
              plugin.$input.data('v-value', '');
            }

            return false;
          }
          // if(exDay.getTime() >= obj.date1.getTime() && exDay.getTime() < obj.date2.getTime()) {
          // 	alert(plugin.options.ERRMSG);
          // 	plugin.$input.data('dateRangePicker').clear();
          // 	plugin.$input.data('dateRangePicker').close();
          //
          // 	return false;
          // }
        }
      }
    },

    tabindexFn: function (today) {
      var at = {};
      if (today.valid) {
        at.tabindex = 0;
      }
      return at;
    },

    pad: function (n, width) {
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
    }
  });
})(jQuery, window, document);