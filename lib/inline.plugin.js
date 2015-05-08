/*global window, document, jQuery */

/*
 * This plugin inlines css properties on selected objects
 *
 * SYNOPSIS:
 *    $('input#name').inlineCSS();
 *
 *    To collect css, not inline it:
 *
 *    $('input#name').collectCSS();
 *
 *
 * Copyright (c) Matthijs van Henten (http://ischen.nl), 2011-2012.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.    See the
 * GNU General Public License for more details.
 */
(function($) {
    function getInlineTextCSS( el ){
        var spec = (
            'font-size font-family font-weight color '
            + 'letter-spacing word-spacing text-align'
        ).split(/\s/);

        return getInlineCSSProperties( el, spec );
    }

    function getInlineBoxCSS( el ){
        var corners     = '%s-top %s-right %s-bottom %s-left';
        var properties  = ['padding','margin'];

        var spec = ['width','height','top','right', 'bottom',
                    'left','float','display','position', 'z-index'];

        for( var i = 0, len = properties.length; i < len; i++ ){
            $.merge( spec, corners.replace(/%s/g, properties[i] ).split(/\s/) );
        }

        return getInlineCSSProperties( el, spec );
    }

    function getInlineBordersCSS( el ){
        var sides   = 'top right bottom left'.split(/\s/);

        var collect = {};

        for( var i = 0, len = sides.length; i < len; i++ ){
            var css = getInlineBorderCSS( el, sides[i] );

            if( css !== false ){
                $.extend( collect, css );
            }
        }
        return collect;
    }

    function getInlineBorderCSS( el, dir ){
        var borders = 'border-%s-width border-%s-style border-%s-color';
        var key   = 'border-' + dir;
        var spec  = borders.replace(/%s/g, dir ).split(/\s/);
        var style = getInlineCSSProperties( el, spec );
        var value = [];

        for( i in style ){
            value.push( style[i]);
        }

        value = value.join( ' ' );

        if( value.indexOf( 'none' ) == -1 ){
            var collect = {};
            collect[key] = value;

            return collect;
        }
        return false;
    }

    function getInlineBackgroundCSS( el ){
        var spec = [
            'background-color',
            'background-image',
            'background-repeat',
            'background-position',
            'background-attachment'
        ];

        return getInlineCSSProperties( el, spec );
    }


    function getInlineCSSProperties( el, spec ){
        var collect = {};

        for( var i = 0, len = spec.length; i < len; i++ ){
            var prop_name = spec[i];
            var value     = $(el).css(prop_name);

            if( value == '0px' ){
                continue;
            }
            if ( typeof value == "number" ) {
                collect[prop_name] = value;
                continue;
            }            
            if( value.indexOf('auto') != -1 ){
                continue;
            }

            collect[prop_name] = value;
        }

        return collect;
    }

    function getCSS( el ){
        var css = {};

        $.extend( css, getInlineTextCSS( el ) );
        $.extend( css, getInlineBoxCSS( el ) );
        $.extend( css, getInlineBordersCSS( el ) );
        $.extend( css, getInlineBackgroundCSS( el ) );

        return css;
    }

    function getCSSString( el ){
        var css = getCSS( el );

        var collect = [];

        for( i in css ){
            collect.push( i + ': ' + css[i] );
        }

        return collect.join( '; ' ) + ';';
    }

    $.fn.inlineCSS = function() {
        this.each(function() {
            $(this).attr('style', getCSSString(this) );
        });
        return this;
    };

    $.fn.collectCSS = function() {
        var collect = [];

        this.each(function() {
            collect.push( { element: this, style: getCSS( this, false ) });
        });

        return collect;
    };
})(jQuery);