/**
 *  jQuery counter
 *  NumberCounter
 *  $( wrapper ).counter();
 */
;(function ($, window, document, undefined) {
  var pluginName = 'counter';

  $.fn[pluginName] = function (options) {
    this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
        PUB.UI.log('[bind] ' + pluginName);
      } else {
        //$(this).find('[data-js="counter__number"]').trigger('update');
      }
    });

    return this;
  };

  $.fn[pluginName].defaults = {
    viewSelector: '[data-js="counter__view"]',
    fieldSelector: '[data-js="counter__number"]',
    decreaseSelector: '[data-js="counter__decrease"]',
    increaseSelector: '[data-js="counter__increase"]',

    text: {
      add: 'ADD',
      remove: 'REMOVE'
    }
  };

  function Plugin(element, options) {
    this.element = element;
    this._name = pluginName;
    this._defaults = $.fn[pluginName].defaults;
    this.options = $.extend({}, this._defaults, options, $(element).data('option'));
    this.uuid = _.uniqueId(pluginName + '-');
    this.init();
  }

  $.extend(Plugin.prototype, {

    init: function () {
      var plugin = this;

      plugin.buildCache();
      plugin.numberHandler(true);
      plugin.bindEvents();
    },

    buildCache: function () {
      var plugin = this;

      plugin._cacheDom();
      plugin._cacheData();
      plugin._renderCachedData();
    },

    _cacheDom: function () {
      var plugin = this;

      plugin.$wrap = $(plugin.element);
      plugin.$view = plugin.$wrap.find(plugin.options.viewSelector);
      plugin.$field = plugin.$wrap.find(plugin.options.fieldSelector);
      plugin.$increase = plugin.$wrap.find(plugin.options.increaseSelector);
      plugin.$decrease = plugin.$wrap.find(plugin.options.decreaseSelector);
      plugin.label = plugin.$field.attr('title') || '';

      plugin.$field.attr({
        id: plugin.uuid,
        role: 'spinbutton'
      });

      plugin.$increase
        .attr('aria-controls', plugin.uuid)
        .html('<span>' + plugin.options.text.add + '</span>');

      plugin.$decrease
        .attr('aria-controls', plugin.uuid)
        .html('<span>' + plugin.options.text.remove + '</span>');
    },

    _cacheData: function () {
      var plugin = this;

      plugin.min = typeof plugin.$field.attr('min') === 'undefined' ? 0 : Number(plugin.$field.attr('min'));
      plugin.max = typeof plugin.$field.attr('max') === 'undefined' ? 0 : Number(plugin.$field.attr('max'));

      plugin.$field.data('max', plugin.max);
      plugin.$field.data('min', plugin.min);
      plugin.$field.data('value', parseInt(plugin.$field.val(), 10) || 0);
      plugin.$field.data('disabled', plugin.max === plugin.min);
    },

    _renderCachedData: function () {
      var plugin = this;

      plugin.$field.attr({
        'aria-valuemin': plugin.min,
        'aria-valuemax': plugin.max,
        'aria-valuenow': ''
      });
      plugin._setLock();
    },

    _setLock: function (isLock) {
      var plugin = this;

      if (_.isUndefined(isLock)) {
        isLock = plugin.min === plugin.max;
      }

      plugin.$increase.attr('disabled', isLock);
      plugin.$decrease.attr('disabled', isLock);
      plugin.$view.toggleClass('is-disabled', isLock);
    },

    correctNumber: function (val, silent) {
      var plugin = this;

      val = Number(val);

      if (plugin.max < val) {
        val = plugin.max;
      } else if (plugin.min > val) {
        val = plugin.min;
      }

      plugin._drawValue(val);
      plugin._buttonState(val);

      if (!silent) {
        plugin.$field.trigger('change');
      }
    },

    _drawValue: function (val) {
      var plugin = this;

      plugin.$field.val(val).attr('aria-valuenow', val);
      plugin.$view.text(plugin.label + ' ' + val);
    },

    _buttonState: function (val) {
      var plugin = this;
      plugin.$increase.attr('disabled', (plugin.max === val));
      plugin.$decrease.attr('disabled', (plugin.min === val));
    },

    buttonHanlder: function (modify) {
      var plugin = this;

      var count = parseInt(plugin.$field.val(), 10);

      if (modify === 'min') {
        count = plugin.min;
      } else if (modify === 'max') {
        count = plugin.max;
      } else {
        count = count + modify;
      }
      plugin.correctNumber(count);
    },

    numberHandler: function (silent) {
      var plugin = this;
      var count = parseInt(plugin.$field.val(), 10);
      plugin.correctNumber(count, silent);
    },

    update: function () {
      var plugin = this;

      plugin._cacheData();
      plugin._renderCachedData();

      plugin.numberHandler(true);
    },

    updateRange: function () {
      var plugin = this;

      plugin.min = typeof plugin.$field.attr('min') === 'undefined' ? 0 : Number(plugin.$field.attr('min'));
      plugin.max = typeof plugin.$field.attr('max') === 'undefined' ? 0 : Number(plugin.$field.attr('max'));

      plugin.max = Math.min(plugin.$field.data('max'), plugin.max);
      plugin.min = Math.max(plugin.$field.data('min'), plugin.min);

      plugin._setLock();
      plugin.numberHandler(true);
    },

    restore: function () {
      var plugin = this;

      plugin.min = plugin.$field.data('min');
      plugin.max = plugin.$field.data('max');
      plugin.disabled = plugin.$field.data('disabled');

      plugin.correctNumber(plugin.$field.data('value'));
    },

    bindEvents: function () {
      var plugin = this;

      plugin.$increase.on('click' + '.' + plugin._name, function (e) {
        e.preventDefault();
        plugin.buttonHanlder(1);
      });

      plugin.$decrease.on('click' + '.' + plugin._name, function (e) {
        e.preventDefault();
        plugin.buttonHanlder(-1);
      });

      plugin.$field
        .on('setValue' + '.' + plugin._name, function (e, val) {
          plugin.correctNumber(val, true);
        })
        .on('lock' + '.' + plugin._name, function (e) {
          plugin._setLock(true);
        })
        .on('unlock' + '.' + plugin._name, function (e) {
          plugin._setLock(false);
        })
        .on('update' + '.' + plugin._name, function (e, isForce) {
          plugin.update(isForce);
        })
        .on('updateRange' + '.' + plugin._name, function () {
          plugin.updateRange();
        })
        .on('restore' + '.' + plugin._name, function () {
          plugin.restore();
        }).on('keydown' + '.' + plugin._name, function (e) {
        switch (e.keyCode) {
          case 38 :
          case 39 :
            e.preventDefault();
            e.stopPropagation();
            plugin.buttonHanlder(1);
            break;
          case 37 :
          case 40 :
            e.preventDefault();
            e.stopPropagation();
            plugin.buttonHanlder(-1);
            break;
          case 35 :
            e.preventDefault();
            e.stopPropagation();
            plugin.buttonHanlder('min');
            break;
          case 36 :
            e.preventDefault();
            e.stopPropagation();
            plugin.buttonHanlder('max');
            break;
          case 13 :
            e.preventDefault();
            e.stopPropagation();
            break;
        }
      });
    },

    unbindEvents: function () {
      var plugin = this;

      plugin.$increase.off('.' + plugin._name);
      plugin.$decrease.off('.' + plugin._name);
      plugin.$field.off('.' + plugin._name);
    }
  });

})(jQuery, window, document);
