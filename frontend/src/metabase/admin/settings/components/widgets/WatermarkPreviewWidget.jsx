import React, {Component} from "react";
import Watermark from "metabase/components/Watermark";
import MetabaseSettings from "metabase/lib/settings";

class WatermarkPreviewWidget extends React.Component {

  render() {
    return (
      <div>
        <div className={"Watermark-target"} style={{height: 200, width: 300, border: '2px solid aqua'}}>
          <Watermark selector=".Watermark-target"
                     color={MetabaseSettings.get("watermark-color", '#EBEBEB')}
                     contentFormat={MetabaseSettings.get("watermark-content", 'watermark-content-1')}></Watermark>
        </div>
      </div>
    );
  }

}

export default WatermarkPreviewWidget;
