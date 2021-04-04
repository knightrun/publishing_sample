
/**
 *   jQuery modal
 *  Modal Layer
 *  $(element).modal();
 */
;(function($, window, document, undefined) {
	var pluginName = 'modal',
		_uuid = 0;

	$.fn[pluginName] = function ( options ) {
		this.each(function() {
			if ( !$.data( this, "plugin_" + pluginName ) ) {
				$.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
				PUB.UI.log( '[bind] '+pluginName );
			}
		});

		return this;
	};

	$.fn[pluginName].defaults = {
		src : '#',
		type : 'alone',     //'alone', 'group'
		group : '[data-modal-group="anchor"]',
		easing : 'swing',
		speed : 300,
		login : false,
		ajaxType : 'GET',
		auto : false,   // 자동오픈
		dim : true,
		dimClose : true,
		onBeforeOpen : null,
		onAfterOpen : null,
		onBeforeClose : null,
		onAfterClose : null,
		onConfirm : null,
		onCancel : null,
		onDestroyComplete : null
	};

	function Plugin ( element, options ) {
		this.$body = $('body');
		this.element = element;
		this.$element = $(this.element);
		this._name = pluginName;
		this._defaults = $.fn[pluginName].defaults;
		this.usePointer  = false;

		this.options = $.extend( {}, this._defaults, options, this.$element.data() );


		this._uuid = ++_uuid;
		this.modalID = pluginName+'-'+this._uuid;
		this.transitionEndName = PUB.UI.transitionEndName || 'transitionEndFallback';
		this.isTouchDevice = PUB.VARS.IS_HAND_DEVICE;
		this.usedDim = this.options.dim;
		this.$modal = null;
		this.$focusFirst = null;
		this.$focusLast = null;
		this.$trigger = null;
		this.ajaxURL = null;
		this.isMoving = null;
		this.iScroll = null;
		this.iScrollTimer = null;

		this.init();
	}

	$.extend( Plugin.prototype, {

		init : function () {
			var plugin = this;
			plugin.buildCache();
			plugin.bindEvents();
		},

		destroy: function() {
			var plugin = this;

			plugin.unBindModalEvent();
			plugin.unbindEvents();
			(plugin.onDestroyComplete !== null) && plugin.onDestroyComplete();
			plugin.$element.removeData("plugin_" + pluginName);
			plugin = null;
		},

		buildCache : function(){
			var plugin = this;
			var _src = plugin.options.src;

			if( _.isString(_src) ){

				if( _src.charAt(0) == '#' && $(_src).length ){
					plugin.modalID = _src;
					plugin.$modal = $(plugin.modalID);
				} else {
					plugin.ajaxURL = _src;
					plugin.options.auto = true;
				}

			} else if( _.isObject(_src) && _src instanceof jQuery ){
				plugin.modalID = plugin._name+'-'+plugin._uuid;
				plugin.$modal = _src;
			}
		},

		show : function(){
			var plugin = this;
			plugin.isMoving = true;
			PUB.UI.layer.push( plugin );

			if( plugin.options.dim ){
				PUB.UI.dim(true,true);
				if( plugin.options.dimClose ){
					PUB.UI.dim('get').on('click.'+plugin.modalID,function(e){
						e.stopPropagation();
						e.preventDefault();
						if( PUB.UI.layer.current() === plugin ){
							plugin.onCancel();
							plugin.hide();
						}
					});
				}
			}

			plugin.$modal.show(0,function(){

				plugin.onBeforeOpen();
				plugin.bindIscroll( plugin.$modal.find('.c-modal__scroll') );
				plugin._addModalHeight();
				if( plugin.$focusFirst == null && plugin.$focusLast == null ){
					plugin.bindModalEvent();
				}
				$(this).addClass('is-active');

			}).one( plugin.transitionEndName ,function(){
				$(this).focus();
				plugin.isMoving = false;
				plugin.onAfterOpen();
				plugin.refreshIscroll();
				plugin.refreshDotdotdot();

			});

			PUB.UI.transitionEndName || plugin.$modal.trigger( plugin.transitionEndName );

		},
		hide : function(){
			var plugin = this;
			if( plugin.isMoving ){
				return
			}

			plugin.isMoving = true;

			PUB.UI.layer.pop( plugin.modalID );

			plugin.onBeforeClose();

			plugin.$modal.one( plugin.transitionEndName ,function(){
				$(this).hide();
				plugin.unBindModalEvent();
				plugin.ajaxURL && plugin.remove();

				if( plugin.options.dim ){

					var isDimClosed = false;

					PUB.UI.dim(false,true,onDimClosed);
					var dimCloseTimer = setTimeout(onDimClosed,600);
					function onDimClosed(){
						if( isDimClosed ){
							clearTimeout(dimCloseTimer);
							return;
						}
						isDimClosed = true;
						plugin.onAfterClose();
						plugin.isMoving = false;
						plugin._removeModalHeight();
					}

					if( plugin.options.dimClose ){
						PUB.UI.dim('get') && PUB.UI.dim('get').off('.'+plugin.modalID);
					}

				} else {

					plugin.onAfterClose();
					plugin.isMoving = false;
					plugin._removeModalHeight();

				}
				plugin.$modal.removeAttr('style');
				plugin.$trigger = null;

			}).removeClass('is-active');

			plugin.$trigger && plugin.$trigger.focus();
			PUB.UI.transitionEndName || plugin.$modal.trigger( plugin.transitionEndName );
		},
		open : function(){
			var plugin = this;

			if( plugin.isMoving ){
				return
			}

			if ( plugin.options.login ){
				if ( !PUB.UI.login.status ){
					// TODO 로그인 체크
					alert('로그인이 필요합니다');
					return ;
				}
			}

			if( plugin.$modal ){
				plugin.show();
				return false;
			}

		},

		close : function(){
			var plugin = this;
			plugin.hide();
			plugin.$body.off('.'+plugin._name+'-'+plugin._uuid);
		},

		_evenCorrector : function( num ){
			num = Math.ceil( num );
			if( num % 2 !== 0){
				num = num + 1;
			}
			return num;
		},

		_addModalHeight : function(){
			var plugin = this,
				_maxHeight =plugin.$modal.css('maxHeight'),
				_styleObject = {},
				_width,
				_height;

			if( _maxHeight === 'none' ){
				return ;
			}

			var modalOffset = plugin.$modal.get(0).getBoundingClientRect();

			_width = plugin._evenCorrector( modalOffset.width );
			_height = plugin._evenCorrector( modalOffset.height );

			if( _maxHeight.indexOf('%') !== -1 ){
				_maxHeight = PUB.VARS.VIEWPORT_HEIGHT / 100 * Number( _maxHeight.replace('%', '') );
			} else if ( _maxHeight.indexOf('px') !== -1 ) {
				_maxHeight = Number( _maxHeight.replace('px', '') );
			}
			_maxHeight = plugin._evenCorrector( _maxHeight );

			if( _height < _maxHeight ){
				_styleObject = {
					width : _width +'px',
					height : 'auto',
					minHeight : _height+'px',
					maxHeight : _maxHeight +'px'
				}
			} else {
				_styleObject = {
					width : _width +'px',
					height : _height+'px',
					maxHeight : _maxHeight +'px'
				}
			}

			plugin.$modal.css(_styleObject)
		},

		_removeModalHeight : function(){
			var plugin = this;
			plugin.$modal.css({
				width : '',
				height :'',
				minHeight:'',
				maxHeight : ''
			});
		},

		bindIscroll : function( $scroll ){
			var plugin = this;

			if( plugin.iScroll ){
				return;
			}

			if( !plugin.isTouchDevice ){
				if( !$scroll.length ){
					return;
				}
				//console.log( "plugin.usePointer", plugin.options.usePointer )
				plugin.iScroll = new IScroll( $scroll.get(0) ,{
					keyBindings : true,
					mouseWheel: true,
					scrollX: true,
					scrollY: true,
					scrollbars: 'custom',
					//disablePointer : !plugin.options.usePointer,
					interactiveScrollbars : true
				});
				PUB.UI.elem.$win.on('resize.'+plugin._name, plugin.refreshIscroll.bind(plugin));
				if( plugin.iScroll ){
					$scroll.addClass('has-iscroll').attr('tabindex',0);
					plugin.autoRefreshIscroll(true);
				}
			} else {
				$scroll.removeClass('has-iscroll').removeAttr('tabindex');
			}
		},
		unbindIscroll : function(){
			var plugin = this;

			if( plugin.iScroll ){
				plugin.autoRefreshIscroll(false);
				plugin.iScroll.destroy();
				plugin.iScroll = null;
				PUB.UI.elem.$win.off('resize.'+plugin._name);
			}
		},
		refreshIscroll : function(){
			var plugin = this;
			if( plugin.iScroll ){
				plugin.iScroll.refresh();
			} else {
				plugin.bindIscroll( plugin.$modal.find('.c-modal__scroll') );
			}
		},

		autoRefreshIscroll : function( active ){
			var plugin = this,
				$content = plugin.$modal.find('.c-modal__content'),
				contentHeight;

			// clearInterval( plugin.iscrollTimer );
			// plugin.iscrollTimer = null;

			/* height bugfix

				var scrollRefresh =function(){
				if( contentHeight !== $content.height() ) {
					console.log( "check" )
					//PUB.UI.log("[iscroll refresh check]")
					plugin._removeModalHeight();
					plugin._addModalHeight();
					plugin.refreshIscroll();
				}
			};*/

			if( active ){
				//on
				// contentHeight = $content.height();
				// plugin.iscrollTimer = setInterval(function(){
				// 	if( contentHeight !== $content.height() ){
				// 		contentHeight = $content.height();
				// 		plugin.refreshIscroll();
				// 	}
				// },600);
				/*
				height bugfix
				contentHeight = $content.height();
				$content.resize(scrollRefresh);
			} else {
				//PUB.UI.log("[iscroll removeResize check]")
				$content.removeResize(scrollRefresh);*/
			}
		},
		refreshDotdotdot : function(){
			var plugin = this;
			plugin.$modal.find('[data-js=dot]').each(function(i, el){
				$(this).dotdotdot();
			});
		},

		onBeforeOpen : function() {
			var plugin = this,
				onBeforeOpen = plugin.options.onBeforeOpen;
			if ( typeof onBeforeOpen === 'function' ) {
				onBeforeOpen.apply( plugin, [plugin] );
			} else if ( typeof onBeforeOpen === 'string' ){
				if( typeof window[onBeforeOpen] === 'function'){
					window[onBeforeOpen]( plugin );
				}
			}
		},

		onAfterOpen : function() {
			var plugin = this,
				onAfterOpen = plugin.options.onAfterOpen;
			if ( typeof onAfterOpen === 'function' ) {
				onAfterOpen.apply( plugin, [plugin] );
			} else if ( typeof onAfterOpen === 'string' ){
				if( typeof window[onAfterOpen] === 'function'){
					window[onAfterOpen]( plugin );
				}
			}
		},

		onBeforeClose : function() {
			var plugin = this,
				onBeforeClose = plugin.options.onBeforeClose;

			plugin.unbindIscroll();

			if ( typeof onBeforeClose === 'function' ) {
				onBeforeClose.apply( plugin, [plugin] );
			} else if ( typeof onBeforeClose === 'string' ){
				if( typeof window[onBeforeClose] === 'function'){
					window[onBeforeClose]( plugin );
				}
			}
		},

		onAfterClose : function() {
			var plugin = this,
				onAfterClose = plugin.options.onAfterClose;
			if ( typeof onAfterClose === 'function' ) {
				onAfterClose.apply( plugin, [plugin] );
			} else if ( typeof onAfterClose === 'string' ){
				if( typeof window[onAfterClose] === 'function'){
					window[onAfterClose]( plugin );
				}
			}
		},


		onConfirm : function() {
			var plugin = this,
				onConfirm = plugin.options.onConfirm;
			if ( typeof onConfirm === 'function' ) {
				onConfirm.apply( plugin, [plugin] );
			} else if ( typeof onConfirm === 'string' ){
				if( typeof window[onConfirm] === 'function'){
					window[onConfirm]( plugin );
				}
			}
		},

		onCancel : function() {
			var plugin = this,
				onCancel = plugin.options.onCancel;
			if ( typeof onCancel === 'function' ) {
				onCancel.apply( plugin, [plugin] );
			} else if ( typeof onCancel === 'string' ){
				if( typeof window[onCancel] === 'function'){
					window[onCancel]( plugin );
				}
			}
		},

		onDestroyComplete : function() {
			var plugin = this,
				onDestroyComplete = plugin.options.onDestroyComplete;
			if ( typeof onDestroyComplete === 'function' ) {
				onDestroyComplete.apply( plugin, [plugin] );
			} else if ( typeof onDestroyComplete === 'string' ){
				if( typeof window[onDestroyComplete] === 'function'){
					window[onDestroyComplete]( plugin );
				}
			}
		},

		bindEvents : function(){
			var plugin = this;

			//if( plugin.options.auto ){
			if( plugin.options.type === 'group'){
				plugin.$element.on('click'+'.'+pluginName, plugin.options.group ,function(e){
					e.stopPropagation();
					e.preventDefault();
					plugin.$trigger = $(this);
					plugin.options.auto && plugin.open();
				});
			} else {
				plugin.$element.on('click'+'.'+pluginName,function(e){
					e.stopPropagation();
					e.preventDefault();
					plugin.$trigger = $(this);
					plugin.options.auto && plugin.open();
				});

				if( plugin.options.type === 'input' ) {
					plugin.$element.on('change'+'.'+pluginName,function(e){
						e.stopPropagation();
						e.preventDefault();
						plugin.$trigger = $(this);
						plugin.options.auto && plugin.open();
					});
				}
			}
			//}

			if( !plugin.ajaxURL ){
				plugin.$modal.on('open'+'.'+pluginName,function(){
					plugin.open();
				});
			}

			if( plugin.$element.is( plugin.$modal ) ){
				plugin.$modal.on('destroy'+'.'+pluginName, plugin.destroy.bind(plugin) );
			} else {
				plugin.$element.on('destroy'+'.'+pluginName, plugin.destroy.bind(plugin) );
			}



		},

		unbindEvents : function(){
			var plugin = this;

			plugin.$element.off('.'+pluginName);
			plugin.$modal.off('.'+pluginName);

		},

		bindModalEvent : function(){
			var plugin = this;
			var $content = plugin.$modal.find('.c-modal__content');

			plugin.unBindModalEvent();

			var focusEls = PUB.MD.FOCUSABLE( plugin.$modal );

			plugin.$focusFirst = $( focusEls.el_firstFocus );
			plugin.$focusLast = $( focusEls.el_lastFocus );

			plugin.$focusFirst.on('keydown'+'.'+pluginName,function(e){
				if (e.target === this){
					var keyCode = e.keyCode || e.which;
					if (keyCode === 9){
						if (e.shiftKey){
							plugin.$focusLast.focus();
							e.stopPropagation();
							e.preventDefault();
						}
					} else if ( keyCode === 27 ){
						plugin.close();
						e.stopPropagation();
						e.preventDefault();
					}
				}
			});

			plugin.$focusLast.on('keydown'+'.'+pluginName,function(e){
				var keyCode = e.keyCode || e.which;
				if (keyCode === 9){
					if (!e.shiftKey){
						plugin.$focusFirst.focus();
						e.stopPropagation();
						e.preventDefault();
					}
				} else if ( keyCode === 27 ){
					plugin.close();
					e.stopPropagation();
					e.preventDefault();
				}
			});

			plugin.$modal.find('[data-dismiss]').on('click'+'.'+pluginName,function(e){
				var _method = $(this).data('dismiss');

				if( _method === 'cancel' || _method === 'confirm'){
					e.stopPropagation();
					(_method === 'confirm') && plugin.onConfirm();
					(_method === 'cancel') && plugin.onCancel();
					plugin.close();
				}
			});

			plugin.$modal.on('keydown'+'.'+pluginName,function(e){
				var keyCode = e.keyCode || e.which;

				if (keyCode === 9){
					if (e.shiftKey){
						var evtTarget = e.target;
						if( plugin.$focusFirst.is(evtTarget) ){
							plugin.$focusLast.focus();
							e.stopPropagation();
							e.preventDefault();
						}
					}
				} else if ( keyCode === 27 ){
					plugin.close();
					e.stopPropagation();
					e.preventDefault();
				}

			});


			plugin.$modal.on('dismiss'+'.'+pluginName,function(){
				plugin.close();
			});

			plugin.$modal.on('close'+'.'+pluginName,function(){
				plugin.close();
			});

			plugin.$modal.on('resize'+'.'+pluginName,function(e){
				e.stopPropagation();
				plugin._removeModalHeight();
				plugin._addModalHeight();
			});

			PUB.UI.elem.$win.on('resize.'+pluginName+'-'+plugin._uuid,function(){
				plugin._removeModalHeight();
				plugin._addModalHeight();
			});

		},

		unBindModalEvent : function(){
			var plugin = this;

			plugin.$focusFirst && plugin.$focusFirst.off('.'+pluginName);
			plugin.$focusLast && plugin.$focusLast.off('.'+pluginName);
			plugin.$modal && plugin.$modal.find('[data-dismiss]') && plugin.$modal.find('[data-dismiss]').off('click'+'.'+pluginName);
			plugin.$modal && plugin.$modal.off('click'+'.'+pluginName);
			plugin.$modal && plugin.$modal.off('keydown'+'.'+pluginName);
			plugin.$modal && plugin.$modal.off('dismiss'+'.'+pluginName);
			plugin.$modal && plugin.$modal.off('close'+'.'+pluginName);
			plugin.$modal && plugin.$modal.off('update'+'.'+pluginName);
			PUB.UI.elem.$win.off('.'+pluginName+'-'+plugin._uuid);
			plugin.$focusFirst = null;
			plugin.$focusLast = null;
		},

		// for ajax Modal
		remove : function(){
			var plugin = this;
			plugin.$modal.off('.'+pluginName);
			plugin.$modal.remove();
			plugin.$modal = null;
		}
	});


})(jQuery, window, document);