import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Button } from 'react-native';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
// 尝试导入MediaPipe，如果不可用则使用占位符
let MediaPipePose;
try {
  MediaPipePose = require('react-native-mediapipe').Pose;
} catch (e) {
  MediaPipePose = null;
}

const MainScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [count, setCount] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [settings, setSettings] = useState({
    repsPerSet: 10,
    totalSets: 3,
    currentSet: 1,
    restTime: 60
  });
  const [showRestModal, setShowRestModal] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);

  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const countdownRef = useRef(null);
  const prevPoseRef = useRef(null);
  const lastCountTimeRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // 初始化MediaPipe Pose
      if (MediaPipePose) {
        try {
          poseRef.current = new MediaPipePose({
            enableTracking: true,
            modelComplexity: 1,
          });
          
          // 设置姿态检测回调
          poseRef.current.onResults((results) => {
            handlePoseResults(results);
          });
        } catch (error) {
          console.log('Failed to initialize MediaPipe Pose', error);
        }
      }
      
      // Load settings
      loadSettings();
    })();
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      // 清理MediaPipe资源
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('squatSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.log('Failed to load settings');
    }
  };

  const startCountdown = (seconds) => {
    setRestTimeLeft(seconds);
    setShowRestModal(true);
    
    countdownRef.current = setInterval(() => {
      setRestTimeLeft(timeLeft => {
        if (timeLeft <= 1) {
          clearInterval(countdownRef.current);
          setShowRestModal(false);
          return 0;
        }
        return timeLeft - 1;
      });
    }, 1000);
  };

  const playSound = async () => {
    try {
      const soundObject = new Audio.Sound();
      // 在实际项目中，你需要添加一个提示音文件
      // await soundObject.loadAsync(require('../assets/sound/beep.mp3'));
      // await soundObject.playAsync();
    } catch (error) {
      console.log('Could not play sound', error);
    }
  };

  const handleSquatDetected = () => {
    // 防止计数过快
    const now = Date.now();
    if (now - lastCountTimeRef.current < 1000) {
      return;
    }
    
    lastCountTimeRef.current = now;
    playSound();
    
    setCount(prevCount => {
      const newCount = prevCount + 1;
      
      // Check if set is complete
      if (newCount >= settings.repsPerSet) {
        if (settings.currentSet < settings.totalSets) {
          // Start rest period
          startCountdown(settings.restTime);
          
          // Update set
          const updatedSettings = {
            ...settings,
            currentSet: settings.currentSet + 1
          };
          setSettings(updatedSettings);
          AsyncStorage.setItem('squatSettings', JSON.stringify(updatedSettings));
          
          // Reset count for next set
          setTimeout(() => setCount(0), 100);
        } else {
          // All sets complete
          Alert.alert('训练完成', '恭喜你完成了所有组的训练！');
          // Reset to first set
          const updatedSettings = {
            ...settings,
            currentSet: 1
          };
          setSettings(updatedSettings);
          AsyncStorage.setItem('squatSettings', JSON.stringify(updatedSettings));
        }
      }
      
      return newCount;
    });
  };

  // 处理MediaPipe姿态检测结果
  const handlePoseResults = (results) => {
    if (!results.poseLandmarks) return;
    
    // 检查是否完成深蹲动作
    if (prevPoseRef.current && isSquatCompleted(prevPoseRef.current, results.poseLandmarks)) {
      handleSquatDetected();
    }
    
    prevPoseRef.current = results.poseLandmarks;
  };

  // 判断是否完成深蹲动作
  const isSquatCompleted = (prevLandmarks, currentLandmarks) => {
    if (!prevLandmarks || !currentLandmarks) return false;
    
    // 获取关键点索引（MediaPipe BlazePose有33个关键点）
    const LEFT_HIP = 24;
    const RIGHT_HIP = 23;
    const LEFT_KNEE = 26;
    const RIGHT_KNEE = 25;
    const LEFT_ANKLE = 28;
    const RIGHT_ANKLE = 27;
    
    // 检查关键点是否存在
    if (!prevLandmarks[LEFT_HIP] || !prevLandmarks[RIGHT_HIP] || 
        !prevLandmarks[LEFT_KNEE] || !prevLandmarks[RIGHT_KNEE] || 
        !prevLandmarks[LEFT_ANKLE] || !prevLandmarks[RIGHT_ANKLE]) {
      return false;
    }
    
    if (!currentLandmarks[LEFT_HIP] || !currentLandmarks[RIGHT_HIP] || 
        !currentLandmarks[LEFT_KNEE] || !currentLandmarks[RIGHT_KNEE] || 
        !currentLandmarks[LEFT_ANKLE] || !currentLandmarks[RIGHT_ANKLE]) {
      return false;
    }
    
    // 判断之前是否为深蹲姿势
    const wasSquat = isSquatPose(prevLandmarks);
    // 判断现在是否为站立姿势
    const isStand = isStandPose(currentLandmarks);
    
    return wasSquat && isStand;
  };

  // 判断是否为深蹲姿势
  const isSquatPose = (landmarks) => {
    const LEFT_HIP = 24;
    const RIGHT_HIP = 23;
    const LEFT_KNEE = 26;
    const RIGHT_KNEE = 25;
    const LEFT_ANKLE = 28;
    const RIGHT_ANKLE = 27;
    
    // 计算膝关节角度
    const leftKneeAngle = calculateAngle(
      landmarks[LEFT_HIP], 
      landmarks[LEFT_KNEE], 
      landmarks[LEFT_ANKLE]
    );
    
    const rightKneeAngle = calculateAngle(
      landmarks[RIGHT_HIP], 
      landmarks[RIGHT_KNEE], 
      landmarks[RIGHT_ANKLE]
    );
    
    // 深蹲时膝关节角度应该小于阈值
    const squatAngleThreshold = 120;
    return leftKneeAngle < squatAngleThreshold && rightKneeAngle < squatAngleThreshold;
  };

  // 判断是否为站立姿势
  const isStandPose = (landmarks) => {
    const LEFT_HIP = 24;
    const RIGHT_HIP = 23;
    const LEFT_KNEE = 26;
    const RIGHT_KNEE = 25;
    const LEFT_ANKLE = 28;
    const RIGHT_ANKLE = 27;
    
    // 计算膝关节角度
    const leftKneeAngle = calculateAngle(
      landmarks[LEFT_HIP], 
      landmarks[LEFT_KNEE], 
      landmarks[LEFT_ANKLE]
    );
    
    const rightKneeAngle = calculateAngle(
      landmarks[RIGHT_HIP], 
      landmarks[RIGHT_KNEE], 
      landmarks[RIGHT_ANKLE]
    );
    
    // 站立时膝关节角度应该接近180度
    const standAngleThreshold = 160;
    return leftKneeAngle > standAngleThreshold && rightKneeAngle > standAngleThreshold;
  };

  // 计算由三个点组成的角度
  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  };

  const resetCount = () => {
    setCount(0);
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>请求相机权限...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text>无相机权限</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera 
        style={styles.camera} 
        ref={cameraRef}
        onCameraReady={() => setIsDetecting(true)}
      >
        <View style={styles.counterContainer}>
          <Text style={styles.counter}>{count}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>第 {settings.currentSet} 组 / 共 {settings.totalSets} 组</Text>
          <Text style={styles.infoText}>目标: {settings.repsPerSet} 个/组</Text>
        </View>
        
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.controlButtonText}>设置</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={resetCount}>
            <Text style={styles.controlButtonText}>重置</Text>
          </TouchableOpacity>
        </View>
      </Camera>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRestModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>组间休息</Text>
            <Text style={styles.modalText}>下一组开始: {restTimeLeft} 秒</Text>
            <Button title="跳过休息" onPress={() => {
              clearInterval(countdownRef.current);
              setShowRestModal(false);
            }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  counterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    fontSize: 100,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  infoContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  infoText: {
    fontSize: 18,
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginBottom: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 30,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 20,
    marginBottom: 20,
  }
});

export default MainScreen;