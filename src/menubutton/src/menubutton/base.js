/**
 * combination of menu and button ,similar to native select
 * @author yiminghe@gmail.com
 */
KISSY.add("menubutton/base", function (S, Node, Button,
                                       MenuButtonRender, Menu, undefined) {

    var $ = Node.all,
        win = $(S.Env.host),
        KeyCode = Node.KeyCode,
        ALIGN = {
            points: ["bl", "tl"],
            overflow: {
                adjustX: 1,
                adjustY: 1
            }
        };
    /**
     * A menu button component, consist of a button and a drop down popup menu.
     * xclass: 'menu-button'.
     * @class KISSY.MenuButton
     * @extends KISSY.Button
     */
    var MenuButton = Button.extend({

        isMenuButton: 1,

        _onSetCollapsed: function (v) {
            if (v) {
                hideMenu(this);
            } else {
                showMenu(this);
            }
        },

        bindUI: function () {
            var self = this;
            self.on('afterHighlightedItemChange',
                onMenuAfterHighlightedItemChange, self);
            win.on("resize",
                self.__repositionBuffer = S.buffer(reposition, 50), self);
            self.on('click', onMenuItemClick, self);
        },

        /**
         * Handle keydown/up event.
         * If drop down menu is visible then handle event to menu.
         * Returns true if the event was handled, falsy otherwise.
         * Protected, should only be overridden by subclasses.
         * @param {KISSY.Event.DOMEventObject} e key event to handle.
         * @return {Boolean|undefined} True Whether the key event was handled.
         * @protected
         */
        handleKeyEventInternal: function (e) {
            var self = this,
                keyCode = e.keyCode,
                type = String(e.type),
                menu = self.get("menu");

            // space 只在 keyup 时处理
            if (keyCode == KeyCode.SPACE) {
                // Prevent page scrolling in Chrome.
                e.preventDefault();
                if (type != "keyup") {
                    return undefined;
                }
            } else if (type != "keydown") {
                return undefined;
            }
            //转发给 menu 处理
            if (menu.get('rendered') && menu.get("visible")) {
                var handledByMenu = menu.handleKeydown(e);
                // esc
                if (keyCode == KeyCode.ESC) {
                    self.set("collapsed", true);
                    return true;
                }
                return handledByMenu;
            }

            // Menu is closed, and the user hit the down/up/space key; open menu.
            if (keyCode == KeyCode.SPACE ||
                keyCode == KeyCode.DOWN ||
                keyCode == KeyCode.UP) {
                self.set("collapsed", false);
                return true;
            }
            return undefined;
        },

        /**
         * Perform default action for menubutton.
         * Toggle the drop down menu to show or hide.
         * Protected, should only be overridden by subclasses.
         * @protected
         *
         */
        performActionInternal: function () {
            var self = this;
            self.set("collapsed", !self.get("collapsed"));
        },

        /**
         * Handles blur event.
         * When it loses keyboard focus, close the drop dow menu.
         * @param {KISSY.Event.DOMEventObject} e Blur event.
         * Protected, should only be overridden by subclasses.
         * @protected
         *
         */
        handleBlur: function (e) {
            var self = this;
            MenuButton.superclass.handleBlur.call(self, e);
            // such as : click the document
            self.set("collapsed", true);
        },


        /**
         * Adds a new menu item at the end of the menu.
         * @param {KISSY.Menu.Item} item Menu item to add to the menu.
         * @param {Number} index position to insert
         */
        addItem: function (item, index) {
            var menu = this.get("menu");
            menu.addChild(item, index);
        },

        /**
         * Remove a existing menu item from drop down menu.
         * @param c {KISSY.Menu.Item} Existing menu item.
         * @param [destroy=true] {Boolean} Whether destroy removed menu item.
         */
        removeItem: function (c, destroy) {
            var menu = this.get("menu");
            menu.removeChild(c, destroy);
        },

        /**
         * Remove all menu items from drop down menu.
         * @param [destroy] {Boolean} Whether destroy removed menu items.
         */
        removeItems: function (destroy) {
            var menu = this.get("menu");
            if (menu) {
                if (menu.removeChildren) {
                    menu.removeChildren(destroy);
                } else if (menu.children) {
                    menu.children = [];
                }
            }
        },

        /**
         * Returns the child menu item of drop down menu at the given index, or null if the index is out of bounds.
         * @param {Number} index 0-based index.
         */
        getItemAt: function (index) {
            var menu = self.get("menu");
            return menu.get('rendered') && menu.getChildAt(index);
        },

        // 禁用时关闭已显示菜单
        _onSetDisabled: function (v) {
            var self = this;
            !v && self.set("collapsed", true);
        },

        destructor: function () {
            var self = this,
                menu,
                repositionBuffer = self.__repositionBuffer;
            if (repositionBuffer) {
                $(win).detach("resize", repositionBuffer, self);
                repositionBuffer.stop();
            }
            menu = self.get("menu");

            menu.destroy();
        }

    }, {
        ATTRS: {

            /**
             * Whether drop down menu is same width with button.
             * Defaults to: true.
             * @type {Boolean}
             */
            matchElWidth: {
                value: true
            },

            /**
             * Whether hide drop down menu when click drop down menu item.
             * eg: u do not want to set true when menu has checked menuitem.
             * Defaults to: false
             * @type {Boolean}
             */
            collapseOnClick: {
                value: false
            },
            /**
             * Drop down menu associated with this menubutton.
             * @type {Menu}
             */
            menu: {
                value: {},
                getter: function (v) {
                    if (!v.isController) {
                        v.xclass = v.xclass || 'popupmenu';
                        v = this.createComponent(v);
                        this.setInternal('menu', v);
                    }
                    return v;
                },
                setter: function (m) {
                    if (m.isController) {
                        m.setInternal('parent', this);
                    }
                }
            },

            /**
             * Whether drop menu is shown.
             * @type {Boolean}
             */
            collapsed: {
                value: false,
                view: 1
            },
            xrender: {
                value: MenuButtonRender
            }
        },
        xclass: 'menu-button'
    });

    function onMenuItemClick(e) {
        if (e.target.isMenuItem && this.get('collapseOnClick')) {
            this.set("collapsed", true);
        }
    }

    function onMenuAfterHighlightedItemChange(e) {
        if (e.target.isMenu) {
            this.view.setAriaActiveDescendant(e.newVal);
        }
    }

    function reposition() {
        var self = this,
            alignCfg,
            alignNode,
            align,
            menu = self.get("menu");
        if (menu.get('rendered') && menu.get("visible")) {
            alignCfg = menu.get("align");
            alignNode = alignCfg.node;
            delete alignCfg.node;
            align = S.clone(alignCfg);
            align.node = alignNode || self.el;
            S.mix(align, ALIGN, false);
            menu.set("align", align);
        }
    }

    function hideMenu(self) {
        var menu = self.get("menu");
        if (menu.get('rendered')) {
            menu.hide();
        }
    }

    function showMenu(self) {
        var el = self.el,
            menu = self.get("menu");
        // 保证显示前已经 bind 好 menu 事件
        if (!menu.get("visible")) {
            // 根据对齐的 el 自动调整大小
            if (self.get("matchElWidth")) {
                menu.render();
                var menuEl = menu.el;
                var borderWidth =
                    (parseInt(menuEl.css('borderLeftWidth')) || 0) +
                        (parseInt(menuEl.css('borderRightWidth')) || 0);
                var align = menu.get("align").node || el;
                menu.set("width", align[0].offsetWidth - borderWidth);
            }
            menu.show();
            reposition.call(self);
            el.attr("aria-haspopup", menu.el.attr("id"));
        }
    }

    return MenuButton;
}, {
    requires: [ "node", "button", "./render", "menu"]
});