import { useState, useEffect } from 'react'; 
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TextInput, FlatList, TouchableOpacity, Dimensions } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { Picker } from '@react-native-picker/picker';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const coloresCategoria: Record<string, string> = {
  'Comida': '#e74c3c',
  'Transporte': '#3498db',
  'Hogar': '#2ecc71',
  'Ocio': '#9b59b6',
  'Otros': '#f1c40f'
};

export default function App() {
  
  const [total, setTotal] = useState(0);
  const [cantidad, setCantidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Comida'); 
  const [gastos, setGastos] = useState<any[]>([]);
  
  // ¡NUEVO! Memoria para guardar lo que nos diga el asistente
  const [mensajeIA, setMensajeIA] = useState('');

  const obtenerMesActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${hoy.getMonth() + 1}`; 
  };

  useEffect(() => {
    cargarDatos(); 
  }, []); 

  const cargarDatos = async () => {
    try {
      const gastosGuardados = await AsyncStorage.getItem('mis_gastos');
      if (gastosGuardados !== null) {
        const listaTraducida = JSON.parse(gastosGuardados);
        setGastos(listaTraducida); 
        recalcularTotal(listaTraducida); 
      }
    } catch (error) {
      console.log('Error al cargar datos:', error);
    }
  };

  const recalcularTotal = (lista: any[]) => {
    const mesActual = obtenerMesActual();
    let totalCalculado = 0;
    lista.forEach((gasto: any) => {
      if (gasto.mes === mesActual) {
        totalCalculado += gasto.monto;
      }
    });
    setTotal(totalCalculado);
    // Borramos el mensaje del asistente si cambia el dinero, para que tenga que volver a analizar
    setMensajeIA(''); 
  };

  const guardarDatos = async (nuevaListaDeGastos: any) => {
    try {
      const textoGuardar = JSON.stringify(nuevaListaDeGastos);
      await AsyncStorage.setItem('mis_gastos', textoGuardar);
    } catch (error) {
      console.log('Error al guardar datos:', error);
    }
  };

  const agregarGasto = () => {
    const numero = parseFloat(cantidad);
    if (numero > 0 && descripcion !== '') {
      const nuevoGasto = {
        id: Date.now().toString(), 
        nombre: descripcion,
        monto: numero,
        categoria: categoria,
        mes: obtenerMesActual() 
      };
      
      const nuevaLista = [...gastos, nuevoGasto];
      setGastos(nuevaLista); 
      recalcularTotal(nuevaLista); 
      setCantidad(''); 
      setDescripcion('');
      guardarDatos(nuevaLista);
    } else {
      alert('Por favor, ingresa una cantidad válida y una descripción.'); 
    }
  };

  const eliminarGasto = (idParaBorrar: string) => {
    const listaFiltrada = gastos.filter((gasto) => gasto.id !== idParaBorrar);
    setGastos(listaFiltrada); 
    recalcularTotal(listaFiltrada); 
    guardarDatos(listaFiltrada);
  };

  const reiniciarTodo = () => {
    setGastos([]); 
    setTotal(0);
    setMensajeIA('');
    guardarDatos([]);
  };

  const mesActual = obtenerMesActual();
  
  const resumenCategorias = gastos
    .filter((gasto) => gasto.mes === mesActual) 
    .reduce((acumulador, gasto) => {            
      const cat = gasto.categoria;
      if (!acumulador[cat]) {
        acumulador[cat] = 0;
      }
      acumulador[cat] += gasto.monto;
      return acumulador;
    }, {} as Record<string, number>);

  const datosGrafica = Object.keys(resumenCategorias).map((cat) => {
    return {
      name: cat,
      monto: resumenCategorias[cat],
      color: coloresCategoria[cat] || '#95a5a6', 
      legendFontColor: '#333',
      legendFontSize: 12
    };
  });

  // ¡NUEVO! El cerebro de nuestro Asistente Financiero
  const analizarGastos = () => {
    if (total === 0) {
      setMensajeIA("Aún no tienes gastos este mes. ¡Sigue así!");
      return;
    }

    let categoriaMayor = '';
    let montoMayor = 0;

    // Buscamos en qué categoría gastaste más
    for (const [cat, monto] of Object.entries(resumenCategorias)) {
      if (monto > montoMayor) {
        montoMayor = monto;
        categoriaMayor = cat;
      }
    }

    // Calculamos qué porcentaje representa ese gasto mayor
    const porcentaje = Math.round((montoMayor / total) * 100);

    // Damos un consejo personalizado basado en la categoría perdedora
    let consejo = '';
    if (categoriaMayor === 'Comida') {
      consejo = "🍔 ¡Estás comiendo mucho fuera! Intenta cocinar más en casa para ahorrar.";
    } else if (categoriaMayor === 'Transporte') {
      consejo = "🚗 El transporte te está saliendo caro. ¿Has considerado compartir viaje o usar transporte público?";
    } else if (categoriaMayor === 'Ocio') {
      consejo = "🎬 ¡Ojo con las salidas! La diversión está absorbiendo tu presupuesto.";
    } else if (categoriaMayor === 'Hogar') {
      consejo = "🏠 Los gastos de la casa dominan este mes. Revisa si puedes apagar focos o reducir servicios.";
    } else {
      consejo = "📦 Vigila esos gastos misceláneos, los 'gastos hormiga' son peligrosos.";
    }

    // Armamos el mensaje final
    const mensajeFinal = `Tu mayor gasto es en ${categoriaMayor} ($${montoMayor}), lo cual representa el ${porcentaje}% de tus gastos.\n\n${consejo}`;
    setMensajeIA(mensajeFinal);
  };

  const nombreMes = new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MoneyFlow 💸</Text>
      <Text style={styles.subtituloMes}>GASTOS DE {nombreMes}</Text>
      <Text style={styles.monto}>Total: ${total}</Text>

      {datosGrafica.length > 0 && (
        <View style={styles.graficaContainer}>
          <PieChart
            data={datosGrafica}
            width={screenWidth - 40} 
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor={"monto"} 
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            center={[10, 0]}
            absolute 
          />
        </View>
      )}

      {/* ¡NUEVO! Sección del Asistente */}
      {total > 0 && (
        <View style={styles.iaContainer}>
          <Button title="🤖 Analizar mis gastos" onPress={analizarGastos} color="#8e44ad" />
          
          {/* Solo mostramos el texto si el asistente ya nos dio un mensaje */}
          {mensajeIA !== '' && (
            <Text style={styles.iaMensaje}>{mensajeIA}</Text>
          )}
        </View>
      )}
      
      <View style={styles.formulario}>
        <TextInput 
          style={styles.input} 
          placeholder="¿En qué gastaste?" 
          value={descripcion} 
          onChangeText={(texto) => setDescripcion(texto)} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="¿Cuánto costó?" 
          keyboardType="numeric" 
          value={cantidad} 
          onChangeText={(texto) => setCantidad(texto)} 
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoria}
            onValueChange={(valorSeleccionado) => setCategoria(valorSeleccionado)}
          >
            <Picker.Item label="🍔 Comida" value="Comida" />
            <Picker.Item label="🚗 Transporte" value="Transporte" />
            <Picker.Item label="🏠 Hogar" value="Hogar" />
            <Picker.Item label="🎬 Ocio" value="Ocio" />
            <Picker.Item label="📦 Otros" value="Otros" />
          </Picker>
        </View>

        <View style={styles.botones}>
          <Button title="Agregar gasto" onPress={agregarGasto} />
          <Button title="Reiniciar" onPress={reiniciarTodo} color="#e74c3c" />
        </View>
      </View>

      <Text style={styles.subtitulo}>Historial del mes:</Text>
      
      <FlatList 
        data={gastos.filter(g => g.mes === mesActual)} 
        keyExtractor={(item) => item.id} 
        renderItem={({ item }) => ( 
          <View style={styles.itemGasto}>
            <View style={styles.infoGasto}>
              <Text style={styles.itemTexto}>{item.nombre}</Text>
              <Text style={styles.itemCategoria}>{item.categoria}</Text>
            </View>
            <View style={styles.accionesGasto}>
              <Text style={styles.itemPrecio}>${item.monto}</Text>
              <TouchableOpacity style={styles.botonBorrar} onPress={() => eliminarGasto(item.id)}>
                <Text style={styles.textoBorrar}>X</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#2c3e50' },
  subtituloMes: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#7f8c8d', marginBottom: 5, letterSpacing: 1 },
  monto: { fontSize: 26, marginBottom: 5, color: '#27ae60', fontWeight: 'bold', textAlign: 'center' },
  
  graficaContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },

  // ¡NUEVO! Estilos para el Asistente
  iaContainer: { marginBottom: 20 },
  iaMensaje: { marginTop: 10, padding: 15, backgroundColor: '#f3e5f5', color: '#8e44ad', borderRadius: 8, fontStyle: 'italic', lineHeight: 22, fontWeight: '500' },

  formulario: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  botones: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  itemGasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 8, borderLeftWidth: 5, borderLeftColor: '#2980b9' },
  infoGasto: { flex: 1 },
  itemTexto: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  itemCategoria: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  accionesGasto: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  itemPrecio: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },
  botonBorrar: { backgroundColor: '#ffeeee', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  textoBorrar: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});