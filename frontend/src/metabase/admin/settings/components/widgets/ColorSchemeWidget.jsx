import React from "react";

import { originalColors, updateColors } from "metabase/lib/colors";
import ColorPicker from "metabase/components/ColorPicker";

const APPLICATION_COLORS_ARRAY = ["brand", "nav", "dashboard_bg"].concat(function(e) {
  if (Array.isArray(e)) {
    const n = Array(e.length);
    for (let t = 0; t < e.length; t++) {
      n[t] = e[t];
    }
    return n;
  }
  return Array.from(e)
}(Object.keys(originalColors).filter(function(e) {
  return e.startsWith("accent")
})));

const APPLICATION_COLORS = {
  brand: {
    name: "Primary color",
    description: "The main color used throughout the app for buttons, links, and the default chart color."
  },
  nav: {
    name: "Navigation bar color",
    description: "The top nav bar of Metabase. Defaults to the Primary Color if not set."
  },
  dashboard_bg: {
    name: "dashboard background color",
    description: "The color of dashboard."
  },
  accent1: {
    name: "Accent 1",
    description: "The color of aggregations and breakouts in the graphical query builder."
  },
  accent2: {
    name: "Accent 2",
    description: "The color of filters in the query builder and buttons and links in filter widgets."
  },
  accent3: {
    name: "Additional chart color"
  },
  accent4: {
    name: "Additional chart color"
  },
  accent5: {
    name: "Additional chart color"
  },
  accent6: {
    name: "Additional chart color"
  },
  accent7: {
    name: "Additional chart color"
  }
};

const r = function(e) {
  for (let t = 1; t < arguments.length; t++) {
    const n = arguments[t];
    for (let r in n)
      Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r])
  }
  return e;
};

class ColorSchemeWidget extends React.Component {

  onChange = async (e) => {
    e.preventDefault();
  };

  render() {
    const {onChange, setting} = this.props;
    const applicationColors = setting.value;
    return (
      <div className="flex">
        <div>
          <table>
            <tbody>
            {
              APPLICATION_COLORS_ARRAY.map(function (applicationColor, index) {
                return (<tr key={index}>
                  <td>
                    {APPLICATION_COLORS[applicationColor].name}
                  </td>
                  <td>
                    <span className="mx1">
                      <ColorPicker
                        value={
                          setting.value[applicationColor] || originalColors[applicationColor]
                        }
                        triggerSize={16}
                        fancy={true}
                        onChange={value => {applicationColors[applicationColor] = value; onChange(applicationColors); updateColors(applicationColors);}}
                      />
                    </span>
                  </td>
                  <td>
                    {
                      setting.value[applicationColor] ? (<svg className="Icon Icon-close text-grey-2 text-grey-4-hover cursor-pointer Icon-cxuQhR kTAgZA"
                                                                                           viewBox="0 0 32 32" width="16" height="16" fill="currentcolor" onClick={() => {delete applicationColors[applicationColor]; onChange(applicationColors); updateColors(applicationColors);}}>
                        <path d="M4 8 L8 4 L16 12 L24 4 L28 8 L20 16 L28 24 L24 28 L16 20 L8 28 L4 24 L12 16 z "></path>
                      </svg>) : null
                    }

                  </td>
                  <td>
                    {APPLICATION_COLORS[applicationColor].description}
                  </td>
                </tr>)
              })
            }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default ColorSchemeWidget;

