import React, {Component} from "react";
import ColorPicker from "metabase/components/ColorPicker";
import Tooltip from "metabase/components/Tooltip";
import { t } from "ttag";
import MetabaseSettings from "metabase/lib/settings";

class WatermarkColorWidget extends React.Component {

  render() {
    const {onChange} = this.props;
    return (
      <div>
        <Tooltip key="background-color" tooltip={t`水印字体颜色`}>
          <ColorPicker
            value={
              MetabaseSettings.get("watermark-color", '#EBEBEB') || '#EBEBEB'
            }
            triggerSize={12}
            fancy={true}
            onChange={value => {console.log("value is :", value);onChange(value);}}
          />
        </Tooltip>
      </div>
    );
  }

}

export default WatermarkColorWidget;
