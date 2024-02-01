/* eslint-disable jsx-a11y/anchor-is-valid */

import * as React from "react";
import { get, has } from "lodash";
import tinycolor from "tinycolor2";
import { toast } from "react-toastify";
import ColorWheel from "./components/ColorWheel";
import { convertColorReleaseToListen } from "./utils/utils";
import GlobalAppContext from "../../utils/GlobalAppContext";

import BrainzPlayer from "../../common/brainzplayer/BrainzPlayer";
import Loader from "../../components/Loader";
import ListenCard from "../../common/listens/ListenCard";
import Card from "../../components/Card";
import { COLOR_WHITE } from "../../utils/constants";
import { ToastMsg } from "../../notifications/Notifications";

export type ColorPlayState = {
  colorReleases: Array<ColorReleaseItem>;
  loading: boolean;
  selectedRelease?: ColorReleaseItem;
  selectedColorString?: string;
  gridBackground: string;
};

export default class ColorPlay extends React.Component<{}, ColorPlayState> {
  static contextType = GlobalAppContext;
  declare context: React.ContextType<typeof GlobalAppContext>;

  constructor() {
    super({});
    this.state = {
      colorReleases: [],
      loading: false,
      gridBackground: COLOR_WHITE,
    };
  }

  onColorChanged = async (rgbString: string) => {
    const { APIService } = this.context;
    const hex = tinycolor(rgbString).toHex(); // returns hex value without leading '#'
    try {
      const colorReleases: ColorReleasesResponse = await APIService.lookupReleaseFromColor(
        hex
      );
      const { releases } = colorReleases.payload;
      const lighterColor = tinycolor(rgbString).lighten(40);
      this.setState({
        colorReleases: releases,
        selectedColorString: rgbString,
        gridBackground: lighterColor.toRgbString(),
      });
    } catch (err) {
      toast.error(
        <ToastMsg
          title="Error"
          message={err.message ? err.message.toString() : err.toString()}
        />,
        { toastId: "error" }
      );
    }
  };

  selectRelease = (
    release: ColorReleaseItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (event) {
      event.preventDefault();
    }
    this.setState({ selectedRelease: release }, () => {
      window.postMessage(
        {
          brainzplayer_event: "play-listen",
          payload:
            release.recordings?.[0] ?? convertColorReleaseToListen(release),
        },
        window.location.origin
      );
    });
  };

  render() {
    const {
      loading,
      colorReleases,
      selectedRelease,
      selectedColorString,
      gridBackground,
    } = this.state;
    const { APIService, currentUser } = this.context;
    const selectedReleaseTracks = selectedRelease?.recordings ?? [];
    return (
      <div role="main">
        <div>
          <h1 className="text-center">
            Huesound<span className="beta">beta</span>
          </h1>
          <div className="row huesound-container">
            <div className="colour-picker-container">
              {colorReleases.length === 0 && (
                <h2 className="text-center">cover art music discovery</h2>
              )}
              <ColorWheel
                radius={175}
                padding={1}
                lineWidth={70}
                onColorSelected={this.onColorChanged}
                spacers={{
                  colour: COLOR_WHITE,
                  shadowColor: "grey",
                  shadowBlur: 5,
                }}
                preset={false} // You can set this bool depending on whether you have a pre-selected colour in state.
                presetColor={selectedColorString}
                animated
              />
              {colorReleases.length === 0 && (
                <h2 className="text-center">
                  Choose a color
                  <br />
                  on the wheel!
                </h2>
              )}
              {colorReleases.length > 0 && !selectedRelease && (
                <h2 className="text-center">
                  Click an album cover to start playing!
                </h2>
              )}
            </div>
            <div
              className={`cover-art-grid ${
                !colorReleases?.length ? "invisible" : ""
              }`}
              style={{ backgroundColor: gridBackground }}
            >
              {colorReleases?.map((release, index) => {
                return (
                  <button
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${release.release_mbid}-${index}`}
                    onClick={this.selectRelease.bind(this, release)}
                    type="button"
                    className="cover-art-container"
                  >
                    <img
                      src={`https://archive.org/download/mbid-${release.release_mbid}/mbid-${release.release_mbid}-${release.caa_id}_thumb250.jpg`}
                      alt={`Cover art for Release ${release.release_name}`}
                      height={150}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {colorReleases.length > 0 && <Loader isLoading={loading} />}
          {selectedRelease && (
            <div className="row align-items-center">
              <div className="col-md-8" style={{ marginTop: "3em" }}>
                <Card style={{ display: "flex" }}>
                  <img
                    className="img-rounded"
                    style={{ flex: 1 }}
                    src={`https://archive.org/download/mbid-${selectedRelease.release_mbid}/mbid-${selectedRelease.release_mbid}-${selectedRelease.caa_id}_thumb250.jpg`}
                    alt={`Cover art for Release ${selectedRelease.release_name}`}
                    width={200}
                    height={200}
                  />
                  <div style={{ flex: 3, padding: "0.5em 2em" }}>
                    <div className="h3">
                      <a href={`/release/${selectedRelease.release_mbid}`}>
                        {selectedRelease.release_name}
                      </a>
                    </div>
                    <div className="h4">
                      {has(
                        selectedRelease,
                        "recordings[0].track_metadata.additional_info.artist_mbids[0]"
                      ) ? (
                        <a
                          href={`/artist/${get(
                            selectedRelease,
                            "recordings[0].track_metadata.additional_info.artist_mbids[0]"
                          )}`}
                        >
                          {selectedRelease.artist_name}
                        </a>
                      ) : (
                        selectedRelease.artist_name
                      )}
                    </div>
                  </div>
                </Card>
                <div style={{ padding: "2em" }}>
                  {selectedRelease.recordings?.map(
                    (recording: BaseListenFormat) => {
                      return (
                        <ListenCard
                          listen={recording}
                          showTimestamp={false}
                          showUsername={false}
                        />
                      );
                    }
                  )}
                </div>
              </div>
              <BrainzPlayer
                listens={selectedReleaseTracks}
                listenBrainzAPIBaseURI={APIService.APIBaseURI}
                refreshSpotifyToken={APIService.refreshSpotifyToken}
                refreshYoutubeToken={APIService.refreshYoutubeToken}
                refreshSoundcloudToken={APIService.refreshSoundcloudToken}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}
