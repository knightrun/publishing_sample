/**
 *  $(element).combobox();
 *  select tag를 감싸고있는 태그
 *  <div class="element">
 *      <select></select>
 *  </div>
 **/
;(function ( $, window, document, undefined ) {

	var pluginName = 'combobox',
		uuid = 0;

	$.fn[pluginName] = function ( options ) {
		this.each(function() {
			if ( !$.data( this, "plugin_" + pluginName ) ) {
				$.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
				PUB.UI.log('[Bind] '+ pluginName , 'pink');
			}
		});

		return this;
	};

	$.fn[pluginName].defaults = {
		prefix : 'combobox',
		selectedClassName : 'is-active',
		disabledClassName : 'is-disabled',
		hiddenClassName : 'is-hidden',

		maxheight : 154,

		urlRegExp : '\/',
		onInitialize : null,
		onBeforeChange : null,
		onAfterChange : null,
		zIndex : 99
	};


	function Plugin ( element, options ) {
		this.element = element;
		this._name = pluginName;
		this._defaults = $.fn[pluginName].defaults;
		this.options = $.extend( {}, this._defaults, options );
		this._uuid = uuid++;
		this.origin = null;
		this.iScroll = null;
		this.hasURL = false;
		this.prefix = this.options.prefix;
		this.isAnimating  = false;
		this.isTouchDevice = PUB.VARS.IS_HAND_DEVICE;
		this.zIndex= this.options.zIndex- this._uuid;
		this.searchKeyword = "";
		this.oldChar = "";
		this.checkIdx = 0;
		this.oldFilterItem = null;
		this.keyTimer = null;
		this.init();
	}

	$.extend( Plugin.prototype, {

		init: function () {
			var plugin = this;
			plugin.buildCache();
			plugin.buildData();
			plugin.buildDom();
			plugin.bindEvents();

			if(plugin.origin.groupIdx != null){
                var idx;
                if(plugin.isTouchDevice){
                	idx = plugin.$select.find('option')
						.index(
                			plugin.$select.find('option:selected')
						);
				}else{
                    idx =  plugin.$item
                        .index(
                            plugin.$list
                                .find('[data-count]').eq(plugin.origin.groupIdx)
                                .find('[data-id]').eq(plugin.origin.idx)
                        );
				}

                plugin.onChange( idx, true );
			}else{
				if( plugin.origin.idx < 0 ) {
					plugin.origin.idx = 0;
				}
                plugin.onChange( plugin.origin.idx, true );
			}
		},

		destroy: function() {
			var plugin = this;

			plugin.unbindEvents();
			plugin.unbindIscroll();

			plugin.$wrap.removeClass(plugin.prefix).removeClass( plugin.origin.klass );
			plugin.$select.siblings().remove();

			plugin.$wrap.removeData('plugin_' + pluginName);
			plugin = null;
		},

		update : function( silent ){
			var plugin = this;

			plugin.buildData();
			plugin.buildDom();

            if(plugin.origin.groupIdx != null){
                var idx =  plugin.$item
                    .index(
                        plugin.$list
                            .find('[data-count]').eq(plugin.origin.groupIdx)
                            .find('[data-id]').eq(plugin.origin.idx)
                    );

                plugin.onChange( idx, silent );
            }else{
                plugin.onChange( plugin.origin.idx, silent );
            }
			// plugin.onChange( plugin.origin.idx, silent );
		},

		buildCache: function () {
			var plugin = this;

			plugin.$wrap = $( plugin.element ).addClass(function(){
				var _name = [];
				_name.push( plugin.prefix );
				plugin.isTouchDevice && _name.push( plugin.prefix+'--touch' );
				return _name.join(' ');
			}).css('zIndex', plugin.zIndex);

			plugin.zIndex = plugin.$wrap.css('zIndex');
			plugin.$select = plugin.$wrap.find('select');
			plugin.origin = {};
			plugin.origin.title = plugin.$select.attr('title') || '';
			plugin.origin.klass = plugin.$select.attr('class') || '';
			plugin.origin.isDisabled = plugin.$select.attr('disabled') || false;
		},

		buildData : function(){
			var plugin = this;

			plugin.origin.idx = plugin.$select.find('option:selected').index() || 0;
			plugin.origin.isDisabled = plugin.$select.attr('disabled') || false;
			plugin.origin.groups = [];
			plugin.origin.options = [];

			plugin.urlOpenTarget = plugin.$select.data('target') || null;
			plugin.urlWithButton = plugin.$select.data('withButton') || null;
			plugin.hasURL = false;

			var $groups = plugin.$select.find('optgroup');

			plugin.$select.find('option').each(function(idx){
				var $this = $(this);
				plugin.origin.options.push({
					'idx' : idx,
					'text' : $this.text() || null,
					'value' : (function(){
						var value = $this.val() || null;
						value && value.match( plugin.options.urlRegExp ) && (plugin.hasURL = true);
						return value;
					})(),
					'selected' : $this.prop('selected'),
					'hidden' : $this.prop('hidden'),
					'disabled' : $this.prop('disabled'),
					'title' : $this.attr('title') || null
				});
			});

			if( $groups.length ) {
				var itemCloneMap = _.map( plugin.origin.options, _.clone );
                plugin.origin.groupIdx = plugin.$select.find('option:selected').closest('optgroup').index() || 0;
                $groups.each(function () {
					var $group = $(this);
					var size = $group.find('option').length || 0;

					plugin.origin.groups.push({
						label: $group.attr('label') || '',
						item : itemCloneMap.splice(0,size)
					});
				});
			}

		},

		template : function(){
			var plugin = this;
			var html = '';

			if( plugin.isTouchDevice ){
				html+= '<div class="'+plugin.prefix+'__button" aria-hidden="true">';
				html+= '<span class="'+plugin.prefix+'__status"></span>';
				html+= '</div>';
				return html;
			}
			var buttonRole = 'combobox',
				handlerRole = 'aria-owns',
				listRole = 'listbox',
				itemRole = 'option';

			if( plugin.hasURL ){
				buttonRole = 'button';
				handlerRole = 'aria-controls';
				listRole = 'navigation';
				itemRole = 'link';
			}

			html+= '<div class="'+plugin.prefix+'__button" tabindex="0" role="'+buttonRole+'" aria-autocomplete="list" title="<%= data.title %>" id="'+plugin.prefix+'__button--<%= id %>" '+handlerRole+'="'+plugin.prefix+'__list--<%= id %>" aria-activedescendant="'+plugin.prefix+'__item--<%= id %>-0">';
			html+= '<span class="'+plugin.prefix+'__status"></span>';
			html+= '</div>';

			html+= '<div class="'+plugin.prefix+'__scroll">';
			html+= '<ul class="'+plugin.prefix+'__list" id="'+plugin.prefix+'__list--<%= id %>" role="'+listRole+'" aria-labelledby="'+plugin.prefix+'__button--<%= id %>" aria-expanded="false">';

			html+= '<% if( data.groups.length ){ %>';
			html+= '<% _.forEach( data.groups, function( _group, _groupIdx ){ %>';
				html+= '<li role="group" data-count="<%= _groupIdx %>"><strong class="'+plugin.prefix+'__label"><%= _group.label %></strong><ul>';

					html+= '<% _.forEach( _group.item, function( _item, _idx ){ %>';
					html+= '<li class="'+plugin.prefix+'__item" id="'+plugin.prefix+'__item--<%= id %>-<%= _item.idx %>" data-idx="<%= _idx %>"  data-id="<%= _item.idx %>" data-val="<%= _item.value %>" title="<%= _item.title %>" role="'+itemRole+'" tabindex="0"><%= _item.text %></li>';
					html+= '<% }); %>';
			html+= '</ul></li>';
			html+= '<% }); %>';

			html+= '<% } else { %>';

			html+= '<% _.forEach( data.options, function( _item, _idx ){ %>';
			html+= '<li class="'+plugin.prefix+'__item" id="'+plugin.prefix+'__item--<%= id %>-<%= _idx %>" data-id="<%= _idx %>" data-val="<%= _item.value %>" title="<%= _item.title %>" role="'+itemRole+'" tabindex="0"><%= _item.text %></li>';
			html+= '<% }); %>';

			html+= '<% }%>';

			html+= '</ul>';
			html+= '</div>';

			return html;
		},

		buildDom : function(){
			var plugin = this;
			var _template = _.template( plugin.template() );
			plugin.$wrap.find("[class^='"+plugin.prefix+"__']").remove();
			plugin.$wrap.addClass( plugin.prefix).addClass( plugin.origin.klass ).append( _template({
				id : plugin._uuid,
				data: plugin.origin
			}) );

			plugin.$scroll = plugin.$wrap.find('.'+plugin.prefix+'__scroll').css('maxHeight', plugin.options.maxheight );
			if( !plugin.isTouchDevice ){
				plugin.$select.addClass('is-ready').attr('tabindex',-1);
			} else {
				plugin.$select.removeClass('is-ready').removeAttr('tabindex');
			}
            //remove element initial class for visible
            plugin.$wrap.removeClass('initial');
            plugin.$select.removeClass('initial');

			plugin.$combo = plugin.$wrap.find('.'+plugin.prefix+'__button');
			plugin.$status = plugin.$wrap.find('.'+plugin.prefix+'__status');
			plugin.$list = plugin.$wrap.find('.'+plugin.prefix+'__list');
			plugin.$item = plugin.$wrap.find('.'+plugin.prefix+'__item');
			plugin.itemLen = plugin.$item.length;
		},

		onChange : function( _newIdx, silent ){
			var plugin = this;

			if( typeof silent === 'undefined' ){
				if( plugin.$select.prop('disabled') ){ return false; }
			}

            if(plugin.origin.groupIdx != null){
                 var idx =  plugin.$item
                    .index(
                        plugin.$list
                            .find('[data-count]').eq(plugin.origin.groupIdx)
                            .find('[data-id='+_newIdx+']')
                    );

                // console.log('parent : ', plugin.origin.groupIdx + "  " + 'optgroup : ' + plugin.origin.groupIdx + "  ",'onChange : ',_newIdx, idx);
                // _newIdx = idx;
            }
			plugin.$status.attr( 'data-id',_newIdx ).text( plugin.origin.options[_newIdx].text );

			if( plugin.origin.isDisabled ){
				plugin.$combo.addClass( plugin.options.disabledClassName );
			} else {
				plugin.$combo.removeClass( plugin.options.disabledClassName );
			}

			plugin.$combo.attr('aria-activedescendant', plugin.prefix+'__item--'+plugin._uuid+'-'+_newIdx );

			plugin.$item.removeClass( plugin.options.selectedClassName )
				.eq( _newIdx )
				.addClass( plugin.options.selectedClassName );

            if( silent ){
                plugin.$select.find('option:eq('+_newIdx+')').prop('selected', true);
            } else {
                plugin.$select.find('option:eq('+_newIdx+')').prop('selected', true).end().change();
            }

			plugin.origin.idx = _newIdx;
		},

		bindIscroll : function(){
			var plugin = this;

			if( !plugin.iScroll && !plugin.isTouchDevice ){
				plugin.iScroll = new IScroll( plugin.$scroll[0] ,{
					scrollbars: true,
					mouseWheel: true,
					scrollX: false,
					scrollY: true,
					snap:false,
					duration: 800,
					interactiveScrollbars: true,
                    preventDefault: true,
                    bounceEasing: {
						style:"cubic-bezier(0.22, 0.61, 0.36, 1)"
                    }
				});
			}
		},

		unbindIscroll : function(){
			var plugin = this;

			if( plugin.iScroll ){
				plugin.iScroll.destroy();
				plugin.iScroll = null;
			}
		},

		_iScrollTo : function( $targetItem, ms ){
			var plugin = this;
			if( plugin.iScroll && $targetItem ){
				plugin.iScroll.scrollToElement( $targetItem[0], ms || 0, null, true );
			}
		},

		findCharindex : function( text ){

		},

		bindEvents: function() {
			var plugin = this;

			//업데이트 이벤트
			plugin.$wrap.on('update'+'.'+plugin._name,function(e,silent){
				e.stopPropagation();
				plugin.update(silent);
			});

			// Override Native Focus Methods
			plugin.$select[0].focus = function(e){
				plugin.$combo.focus();
			};
			plugin.$select.on('focus',function(e){
				plugin.$combo.focus();
			});

			//선택 초기화 이벤트
			plugin.$wrap.on('reset'+'.'+plugin._name,function(e,silent){
				// e.stopPropagation();
				plugin.onChange(0,true);
			});

			if( plugin.isTouchDevice ){
				plugin.$select.on('change'+'.'+plugin._name, function(e){
					e.stopPropagation();
					var $this = $(this);
					var url = $this.val();

					if( !plugin.urlWithButton && url.match( plugin.options.urlRegExp ) ){
						if( plugin.urlOpenTarget ){
							PUB.MD.openNewWindow(url, plugin.urlOpenTarget );
						} else {
							location.href = url;
						}
					} else {
						if(plugin.origin.groupIdx != null){
                            plugin.origin.groupIdx = $this.find('option:selected').closest('optgroup').index();
                            var idx = plugin.$select
                                .find('option')
                                .index(
                                    plugin.$select
                                        .find('optgroup').eq(plugin.origin.groupIdx)
                                        .find('option:selected')
                                );
                            plugin.$status.text( plugin.origin.options[ idx ].text );
						}else{
                            plugin.$status.text( plugin.origin.options[ $this.find('option:selected').index() ].text );
						}
					}
				});
				return;
			}

			if( plugin.hasURL ){
				plugin.$select.on('change'+'.'+plugin._name, function(e){
					e.stopPropagation();
					e.preventDefault();
					var url = $(this).val();
					if( !plugin.urlWithButton && url.match( plugin.options.urlRegExp ) ){
						if( plugin.urlOpenTarget ){
							PUB.MD.openNewWindow(url, plugin.urlOpenTarget );
						} else {
							location.href = url;
						}
					}
				});
			}

			// if(plugin.origin.groupIdx != null){
             //    plugin.$select.on('change'+'.'+plugin._name, function(e){
             //    	console.log(plugin.$select);
             //        plugin.origin.groupIdx = plugin.$select.find('option:selected').closest('optgroup').index();
             //        console.log('plugin.origin.groupIdx : ',plugin.$select.find('option:selected'))
             //        e.stopPropagation();
             //        e.preventDefault();
             //    });
			// }
			//콤보박스
			plugin.$wrap.on('click'+'.'+plugin._name,'.'+plugin.prefix+'__button',function(e){
				e.preventDefault();
				//e.stopPropagation();
				plugin.$list.is(':visible') ? plugin.closeList() : plugin.openList();

			}).on('keydown'+'.'+plugin._name,'.'+plugin.prefix+'__button',function(e){

				if( e.shiftKey ){
					if(e.keyCode === 9){
						plugin.closeList();
					}
				} else if (!e.altKey){
					if( plugin.hasURL && [9,13,27,32].indexOf( e.keyCode ) === -1 ) {
						return false;
					}
                    switch (e.keyCode) {

						case 13 :	//enter
							e.preventDefault();
                            break;

						case 27 :	//esc
							plugin.closeList();
							break;

						case 32 :	//space
							plugin.openList();
							e.preventDefault();
							break;

						case 33 :	//pageUp
							if ( plugin.origin.idx >= 3){
								plugin.$item.eq( plugin.origin.idx-3 ).click();
							} else {
								plugin.$item.eq(0).click();
							}
							e.preventDefault();
							break;

						case 34 :	//pageDown
							if ( plugin.itemLen > plugin.origin.idx+3 ){
								plugin.$item.eq( plugin.origin.idx+3 ).click();
							} else {
								plugin.$item.eq( plugin.itemLen-1 ).click();
							}
							e.preventDefault();
							break;

						case 35 :	//end
							plugin.$item.eq(-1).click();
							e.preventDefault();
							break;

						case 36 :	//home
							plugin.$item.eq(0).click();
							e.preventDefault();
							break;

						case 37 :	//left
						case 38 :	//up
							if ( plugin.origin.idx > 0){
								plugin.$item.eq(plugin.origin.idx-1).click();
							}
							e.preventDefault();
							break;

						case 39 :	//right
						case 40 :	//down
							if (plugin.origin.idx < plugin.itemLen){
								plugin.$item.eq(plugin.origin.idx+1).click();
							}
							e.preventDefault();
							break;
					}
				} //no altKey
				else if (e.altKey){
					switch (e.keyCode) {
						case 38 :	//up
						case 40 :	//down
							plugin.openList();
							break;
					}
				}

			}).on('keypress'+'.'+plugin._name,'.'+plugin.prefix+'__button',function(e){
				clearTimeout(plugin.keyTimer);

				var keyCode = e.keyCode || e.which;
				var charStr = String.fromCharCode(keyCode);
				plugin.searchKeyword = ( plugin.searchKeyword === "" ) ? charStr : plugin.searchKeyword + charStr;

				var $filterItem = plugin.$item.filter(function( idx ){
					var $this = $(this);
					return $this.text().match("^" + plugin.searchKeyword);
				});

				if( $filterItem.length ) {
					plugin.origin.idx = $filterItem.eq(0).data('id');
					plugin.$item.eq( plugin.origin.idx ).click();
					plugin.oldFilterItem = $filterItem;
					plugin.checkIdx++;
				} else {
					if( plugin.oldFilterItem && plugin.oldChar === charStr) {
						plugin.origin.idx = plugin.oldFilterItem.eq( plugin.checkIdx ).data('id');
						plugin.$item.eq( plugin.origin.idx ).click();
						plugin.checkIdx++;
						if( plugin.checkIdx >= plugin.oldFilterItem.length ) {
							plugin.oldFilterItem = null;
							plugin.searchKeyword = "";
							plugin.checkIdx = 0;
						}
					} else {
						plugin.oldFilterItem = null;
						plugin.searchKeyword = "";
						plugin.checkIdx = 0;
						plugin.keyTimer = setTimeout(function(){
							plugin.oldFilterItem = null;
							plugin.searchKeyword = "";
							plugin.checkIdx = 0;
							console.log( "settime" )
						}, 1000);
					}

				}

				plugin.oldChar = charStr;

				/*
				plugin.keyTimer = setTimeout(function(){
					plugin.oldFilterItem = null;
					plugin.searchKeyword = "";
					plugin.checkIdx = 0;
					console.log( "settime" )
				}, 2000);
				*/

			});

			//옵션
			plugin.$wrap.on('click'+'.'+plugin._name,'.'+plugin.prefix+'__item',function(e){
				//체인지
				e.stopPropagation();
				e.preventDefault();

				if(plugin.origin.groupIdx != null){
                    plugin.origin.groupIdx = $(this).closest('[data-count]').index();
				}

				plugin.onChange( $(this).data('id') );

				plugin.closeList();
			}).on('keydown'+'.'+plugin._name,'.'+plugin.prefix+'__item',function(e){

				var idx = $(this).data('id');

				if (!e.altKey ){
					switch (e.keyCode) {
						case 9 :
							if(!e.shiftKey && (idx >= plugin.itemLen-1) ){
								e.preventDefault();
								plugin.closeList();
							}
							break;

						case 13 :	//space
						case 32 :	//enter
							$(this).click();
							e.preventDefault();
							break;

						case 27 : //esc
							plugin.closeList();
							//plugin.$combo.focus();
							break;

						case 33 :	//pageUp
							if (idx >= 3){
								plugin.$item.eq(idx-3).focus();
							} else {
								plugin.$item.eq(0).focus();
							}
							e.preventDefault();
							break;

						case 34 :	//pageDown
							if (plugin.itemLen >= idx+3){
								plugin.$item.eq(idx+3).focus();
							} else {
								plugin.$item.eq(-1).focus();
							}
							e.preventDefault();
							break;

						case 35 : //end
							plugin.$item.eq(-1).focus();
							e.preventDefault();
							break;

						case 36 : //home
							plugin.$item.eq(0).focus();
							e.preventDefault();
							break;

						case 37 :	//up
						case 38 :	//left
							if (idx != 0){
								idx--;
							}
							plugin.$item.eq(idx).focus();
							e.preventDefault();
							break;

						case 39 :	//right
						case 40 :	//down
							idx++;
							plugin.$item.eq(idx).focus();
							e.preventDefault();
							break;

					}
				} //no altKey
				else if (e.altKey){
					switch (e.keyCode) {
						case 38 :	//up
						case 40 :	//down
							plugin.closeList();
							break;
					}
				} //alt
			}).on('focusin'+'.'+plugin._name,'.'+plugin.prefix+'__item',function(e){
				e.stopPropagation();
				plugin._iScrollTo( $(this) );
			});

			PUB.UI.elem.$html
				.on('click'+'.'+plugin._name+'-'+plugin._uuid, function(e){
					if( !$.contains( plugin.$wrap.get(0), e.target ) ){
						plugin.closeList('force');
					}
				} );
		},

		unbindEvents: function() {
			var plugin = this;
			plugin.$wrap.off('.'+plugin._name);
			PUB.UI.elem.$html.off('.'+plugin._name+'-'+plugin._uuid);
		},

		openList : function(){
			var plugin = this;
			if( plugin.$select.prop('disabled') ){ return false; }

			if( plugin.isAnimating ){
				return false;
			}

			// Close event Emit for Another Comboboxs
			PUB.UI.elem.$html
				.on('LIB_COMBOBOX_EXCLUDE_CLOSE.'+plugin._name+'-'+plugin._uuid, plugin._emitHandler.bind(plugin) )
				.trigger('LIB_COMBOBOX_EXCLUDE_CLOSE', plugin);

			plugin.isAnimating = true;
			plugin.$combo.addClass('is-opened');
			plugin.$scroll.addClass('is-opened').slideDown(200,function(){
				var $activeItem = plugin.$item.eq( plugin.origin.idx );

				plugin.bindIscroll();
				plugin._iScrollTo( $activeItem );
				plugin.iScroll && plugin.$scroll.toggleClass('has-scrollbar', plugin.iScroll.hasVerticalScroll);
				$activeItem.focus();
				plugin.isAnimating = false;

			});
			plugin.$list.attr('aria-expanded','true');
		},

		closeList : function( isForce ){
			var plugin = this;

			plugin.$combo.removeClass('is-opened');
			plugin.$scroll.removeClass('is-opened').slideUp(200);
			plugin.$list.attr('aria-expanded','false');

			if( !isForce ){
				plugin.$combo.focus();
			}

			plugin.unbindIscroll();
			PUB.UI.elem.$html.off('LIB_COMBOBOX_EXCLUDE_CLOSE.'+plugin._name+'-'+plugin._uuid);
		},

		_emitHandler : function( e, activePlugin ){
			var plugin = this;

			if( plugin != activePlugin ){
				plugin.closeList('force');
			}
		}
	});


})( jQuery, window, document );
