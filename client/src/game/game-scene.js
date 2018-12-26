import { Scene, director, Button, Sprite, State } from './../util/import'
import GameLayer from './game-layer'
import UILayer from './ui-layer'
import resources from './../resources'
import global from './../global'
import defines from './../defines'
import RankLayer from './rank-layer'
import WaitLayer from './wait-layer'
import Connect from './connect'
import HealthGameTips from './health-game-tips'
const GameState = {
    Matching: 'matching',
    Shareing: 'shareing',
    Gameing: 'gameing',
    WaitOffline: 'wait-offline',
    PlayerLeave: 'player-leave'
}
class GameScene extends Scene {
    constructor() {
        super();
        this._roomId = undefined;
        this._callBackMap = {};
        this._messageIndex = 1;
        this._state = new State();

        this._state.addState(GameState.Matching, () => {
            console.log('切换到匹配中的状态');
            this.showMatchingState()
        });
        this._state.addState(GameState.Shareing, () => {
            console.log('分享的状态');
            this.showWaitFriendState();
        });
        this._state.addState(GameState.WaitOffline, () => {
            this.showWaitOfflineState();
        });
        this._state.addState(GameState.PlayerLeave, () => {
            this.showWaitOfflineState();
        });
    }
    setAuthorize(cb) {
        wx.getSetting({
            success: (res) => {
                if (!res.authSetting['scope.userInfo']) {
                    console.log('没有用户信息授权')
                    this.showLoginButton(cb);

                } else {
                    // this.login(cb);
                    if (cb) {
                        cb();
                    }
                }
            }
        });
        //监听被动分享消息
        wx.onShareAppMessage(() => {
            return {
                title: '跟我下一盘五子棋吧',
                imageUrl: defines.resourcesUrl + '/images/share_image.png',
                query: 'roomId=' + this._roomId
            }
        });
        //显示分享按钮
        wx.showShareMenu();



    }
    showLoginButton(cb) {
        let button = wx.createUserInfoButton({
            type: 'image',
            image: defines.resourcesUrl + '/images/login_button.png',
            // image: './static/textures/login_button.png',
            style: {
                left: director.windowWidth * 0.5 - 136 * 0.5,
                top: director.windowHeight * 0.5 - 74 * 0.5,
                width: 136,
                height: 74
            }
        });
        button.onTap((res) => {
            console.log('tap res  =', res);
            if (res.errMsg === 'getUserInfo:ok') {
                button.hide();
                if (cb) {
                    cb(res.userInfo);
                }
            }
        });
    }
    onLoad() {
        console.log('初始化游戏');
        this._gameLayer = new GameLayer(this);
        this.addLayer(this._gameLayer);
        this._rankLayer = new RankLayer(this);
        this.addLayer(this._rankLayer);
        this._uiLayer = new UILayer(this);
        this.addLayer(this._uiLayer);

        this._titleLabel = new Sprite(global.resource[resources.matching_title].texture);
        this.addChild(this._titleLabel);
        this._titleLabel.position = {
            x: director.designSize.width * 0.5,
            y: director.designSize.height * 0.5 - 150
        }
        this._titleLabel.scale.set(2);
        this._titleLabel.visible = false;


        this._shareButton = new Button({
            normalTexture: global.resource[resources.shard_friend_button].texture,
            touchCb: () => {
                console.log('邀请按钮');

                switch (this._state.getState()) {
                    case GameState.Matching:
                    case GameState.WaitOffline:
                        //等在的状态 或者是 匹配的状态
                        this._connect.shareToFriend();
                        break;
                    case GameState.Shareing:
                        //  取消分享
                        this._connect.cancelShareRoom();
                        break;
                }

            }
        })
        this._shareButton.position = {
            x: director.designSize.width * 0.5,
            y: director.designSize.height * 0.5
        }
        this._shareButton.scale.set(2);
        this.addChild(this._shareButton);
        this._shareButton.visible = false;


        this._matchButton = new Button({
            normalTexture: global.resource[resources.re_start_button].texture,
            touchCb: () => {
                console.log('从新匹配');
                this._connect.reMatchRoom();
            }
        });
        this._matchButton.position = {
            x: director.designSize.width * 0.5,
            y: director.designSize.height * 0.5 + 150
        }
        this._matchButton.scale.set(2);
        this.addChild(this._matchButton);
        this._matchButton.visible = false;

        this._healthGameTips = new HealthGameTips(this);
        this.addLayer(this._healthGameTips);


        this.setAuthorize(() => {
            console.log('授权成功');
            wx.getUserInfo({
                withCredentials: false,
                success: res => {
                    console.log('data ' + JSON.stringify(res))

                    global.playerInfo.avatarUrl = res.userInfo.avatarUrl;
                    global.playerInfo.nickName = res.userInfo.nickName;
                    this._connect = new Connect(this);
                },
                fail: () => { },
                complete: () => { }
            });
            //授权成功之后 ，开始链接服务器
            //首选成功之后，保存当前的 头像信息等
        });
       
    }
    loginSuccess() {
        // if (this._shareButton) {

        //     this._shareButton.visible = true;
     
        // }
        // this._titleLabel.texture = global.resource[resources.matching_title].texture;
        // this._titleLabel.scale.set(2);
        // this._titleLabel.visible = true;

        // if (!this._matchButton) {
           
        // }
    }
    syncPlayerInfo(data) {
        console.log('sync player info = ', data);
        let playerInfo = data.playerInfo;
        this._gameLayer.syncPlayerInfo(playerInfo);
        let state = data.roomState;
        switch (state) {
            case 'gameing':
                console.log('游戏中');
                if (this._titleLabel) {
                    this._titleLabel.visible = false;

                }
                if (this._shareButton) {
                    this._shareButton.visible = false;
                }
            case 'matching':
                console.log('展示匹配中的字样');
                this._state.setState(GameState.Matching);
                // this.showMatchingState();
                break;
            case 'wait-offline-player':
                console.log('等待掉线玩家');
                this._state.setState(GameState.WaitOffline);
                break;
            case 'player-leave':
                console.log('玩家离开了 房间');
                this._state.setState(GameState.PlayerLeave);
                break;
            default:
                break;
        }

    }
    notify(messageType, data, cb) {
        this._connect.emit('notify', {
            messageType: messageType,
            messageIndex: this._messageIndex,
            data: data
        })
        this._callBackMap[this._messageIndex] = cb;
        this._messageIndex++;
    }
    playerPushPiece(index) {
        // this._connect.emit('choose-board', index);
        this._connect.chooseBoard(index);
    }
    closeGameOverLayer() {
        //关闭了游戏结束层
        if (this._gameLayer) {
            this._gameLayer.removeAllPiece();
        }
    }
    noPSharedButton() {
        //没有参数的分享按钮
        wx.shareAppMessage({
            title: '跟我下一盘五子棋吧',
            imageUrl: defines.resourcesUrl + '/images/share_image.png'
        })
    }
    waitFriendEnterRoom() {
        this._state.setState(GameState.Shareing);
    }

    showWaitFriendState() {
        console.log('等待好友进入房间');
        this._titleLabel.texture = global.resource[resources.wait_friend_tips].texture;
        this._titleLabel.scale.set(2);
        this._matchButton.visible = false;
        this._shareButton.setNormalTexture(global.resource[resources.cancel_share_button].texture);
    }
    showMatchingState() {
        console.log('展示匹配中的ui')
        this._titleLabel.texture = global.resource[resources.matching_title].texture;
        this._titleLabel.visible = true;
        this._shareButton.visible = true;
        this._shareButton.setNormalTexture(global.resource[resources.shard_friend_button].texture);
        this._titleLabel.texture = global.resource[resources.matching_title].texture;
        this._titleLabel.scale.set(2);
        this._matchButton.visible = false;
    }
    showWaitOfflineState() {
        console.log('展示等待掉线玩家的ui');
        this._titleLabel.texture = global.resource[resources.wait_tips].texture;
        this._titleLabel.scale.set(2);
        this._titleLabel.visible = true;
        this._shareButton.visible = true;
        this._matchButton.visible = true;


    }
    syncCurrentColor(data) {
        this._gameLayer.changeCurrentColor(data);
    }
    syncBoardData(data) {
        this._gameLayer.referBoard(data);
    }
    syncReferRank(data) {
        this._rankLayer.referRankData(data);
    }
    gameWin(color) {
        this._uiLayer.showWin(color);
    }
}
export default GameScene;